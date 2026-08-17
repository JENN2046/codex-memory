'use strict';

const HISTORICAL_PROVIDER_CONTAINER_ID =
  'b029e01fa779462ef79f5bb41eec31871488cf62de836879e91ddb9edc647fa9';
const HISTORICAL_PROVIDER_DAEMON_IMAGE_IDENTITY =
  'sha256:69aef0d276a5e00fb6f6d9f11b199fd9ec42d89a0857924547ee4249ad2094a3';
const HISTORICAL_PROVIDER_REVISION = '6ce7305cd36f16506fb6a2c3c524a5a318539ba7';

function historicalProviderInspect(overrides = {}) {
  const value = {
    Config: {
      Cmd: null,
      Entrypoint: ['/new-api'],
      Env: ['SQLITE_PATH=/data/new-api.db', 'TZ=Asia/Shanghai', 'PORT=3000',
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      Healthcheck: null,
      Image: 'calciumion/new-api:latest',
      Labels: {
        'com.docker.compose.config-hash':
          '9dc742607c45aeff4044f5a46d0c6ea0012a5a4bbe3c1ba089993239dde8e56d',
        'com.docker.compose.project': 'new-api-wsl',
        'com.docker.compose.service': 'new-api',
        'org.opencontainers.image.revision': HISTORICAL_PROVIDER_REVISION,
        'org.opencontainers.image.source': 'https://github.com/QuantumNous/new-api',
        'org.opencontainers.image.version': 'v1.0.0-rc.20'
      },
      User: '',
      WorkingDir: '/data'
    },
    HostConfig: {
      CapAdd: null,
      CapDrop: null,
      CgroupnsMode: 'private',
      Devices: [],
      DeviceRequests: null,
      IpcMode: 'private',
      LogConfig: { Config: {}, Type: 'json-file' },
      NetworkMode: 'new-api-wsl_default',
      PidMode: '',
      PortBindings: {
        '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }]
      },
      Privileged: false,
      ReadonlyRootfs: false,
      RestartPolicy: { MaximumRetryCount: 0, Name: 'unless-stopped' },
      SecurityOpt: null,
      Tmpfs: {},
      UsernsMode: '',
      UTSMode: ''
    },
    Id: HISTORICAL_PROVIDER_CONTAINER_ID,
    Image: HISTORICAL_PROVIDER_DAEMON_IMAGE_IDENTITY,
    Mounts: [{
      Destination: '/data',
      Driver: 'local',
      Mode: 'rw',
      Name: 'new-api-wsl-data-v1',
      Propagation: '',
      RW: true,
      Source: '/var/lib/docker/volumes/new-api-wsl-data-v1/_data',
      Type: 'volume'
    }],
    Name: '/new-api-wsl',
    State: { Running: false }
  };
  return Object.assign(value, overrides);
}

module.exports = {
  HISTORICAL_PROVIDER_CONTAINER_ID,
  HISTORICAL_PROVIDER_DAEMON_IMAGE_IDENTITY,
  HISTORICAL_PROVIDER_REVISION,
  historicalProviderInspect
};
