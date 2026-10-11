"""Secret-free build runner. OIDC authorizes only this repository/workflow."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import zipfile

API = 'https://misfaldones.com/pokedex/api/index.php/runner'

def oidc():
    url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=pokedex-build'
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)['value']

def request(route, body=b'{}', headers=None):
    headers = {'Authorization': 'Bearer ' + oidc(), **(headers or {})}
    with urllib.request.urlopen(urllib.request.Request(API + route, data=body, headers=headers, method='POST'), timeout=90) as response:
        return json.load(response)

def execute(command, timeout):
    # Never print arbitrary source/test logs to this public repository's Actions log.
    process = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
    if process.returncode:
        raise RuntimeError(process.stdout.decode('utf8', 'replace')[-10000:])

def main():
    build = request('/claim')['build']
    if build is None:
        print('Runner connected; no build pending.')
        return
    passed = False
    body = b''
    try:
        with tempfile.TemporaryDirectory(prefix='pokedex-build-') as temporary:
            root = Path(temporary)
            source = root / 'source'
            output = root / 'output'
            source.mkdir(); output.mkdir()
            for item in build['files']:
                name = item['path']
                if name.startswith('/') or '\\' in name or '..' in name.split('/') or not (name.startswith(('src/', 'public/')) or name in ('package.json', 'package-lock.json')):
                    raise ValueError('Unsafe build source path')
                target = source / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(base64.b64decode(item['data'], validate=True))
            # Only trusted dependency manifests are sent by IONOS; the model cannot modify them.
            (source / 'Dockerfile').write_text('FROM node:22-bookworm-slim\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci --ignore-scripts --no-audit --no-fund\n', encoding='utf8')
            image = 'pokedex-test:' + str(build['id'])
            execute(['docker', 'build', '--progress=plain', '-t', image, str(source)], 480)
            # The generated source gets no credentials, host environment, or network.
            command = ['docker', 'run', '--rm', '--network=none', '--cap-drop=ALL', '--security-opt=no-new-privileges',
                       '--memory=3g', '--pids-limit=512', '--read-only', '--tmpfs', '/tmp:rw,size=256m', '--tmpfs', '/app/node_modules/.cache:rw,size=256m',
                       '--mount', f'type=bind,src={source / "src"},dst=/app/src,readonly',
                       '--mount', f'type=bind,src={source / "public"},dst=/app/public,readonly',
                       '--mount', f'type=bind,src={output},dst=/output',
                       '-e', 'CI=true', '-e', 'HOME=/tmp', '-e', 'BUILD_PATH=/output',
                       image, 'sh', '-c', 'npm test -- --watchAll=false --runInBand && npm run build']
            execute(command, 360)
            archive = root / 'build.zip'
            with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
                for file in output.rglob('*'):
                    if file.is_symlink():
                        raise ValueError('Build contains a symbolic link')
                    if file.is_file() and file.suffix != '.map':
                        package.write(file, file.relative_to(output).as_posix())
            body = archive.read_bytes()
            if len(body) > 8000000:
                raise ValueError('Build exceeds upload size limit')
            passed = True
    except Exception as error:
        body = str(error).encode('utf8')[-12000:]
    request('/' + str(build['id']) + '/result', body, {'X-Build-Lease': build['lease'], 'X-Build-Passed': str(passed).lower(), 'Content-Type': 'application/octet-stream'})
    print('Build passed.' if passed else 'Build failed; private diagnostics returned to IONOS.')

if __name__ == '__main__':
    main()
