'use strict';

const HISTORICAL_PROVIDER_CONTAINER_ID =
  '16ab6cccfad656b332ae8d27ea96fa4aaee2c1a8d132b609c3d8596e42e6426f';
const HISTORICAL_PROVIDER_IMAGE_CONFIG =
  'sha256:8ca23f4e6c9ff728e7ad277fbe2538f7a5a43ea40a26c23b04c0d6b48208c018';
const HISTORICAL_PROVIDER_REVISION = '6ce7305cd36f16506fb6a2c3c524a5a318539ba7';

function historicalProviderInspect(overrides = {}) {
  const value = {
    Config: {
      Cmd: null,
      Entrypoint: ['/new-api'],
      Env: ['PORT=3000', 'SQLITE_PATH=/data/new-api.db', 'TZ=Asia/Shanghai'],
      Healthcheck: null,
      Image: 'calciumion/new-api:v1.0.0-rc.20',
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
    Image: HISTORICAL_PROVIDER_IMAGE_CONFIG,
    Mounts: [{
      Destination: '/data',
      Driver: 'local',
      Mode: 'rw',
      Name: 'new-api-wsl-data-v1',
      Propagation: 'rprivate',
      RW: true,
      Source: '/var/lib/docker/volumes/new-api-wsl-data-v1/_data',
      Type: 'volume'
    }],
    Name: '/new-api-wsl',
    State: { Running: true }
  };
  return Object.assign(value, overrides);
}

module.exports = {
  HISTORICAL_PROVIDER_CONTAINER_ID,
  HISTORICAL_PROVIDER_IMAGE_CONFIG,
  HISTORICAL_PROVIDER_REVISION,
  historicalProviderInspect
};
