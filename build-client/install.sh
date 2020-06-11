#!bin/sh

set -e

GITHUB_URL=https://github.com/appveen/orcli/build-client

info()
{
    echo '[INFO] ' "$@"
}
warn()
{
    echo '[WARN] ' "$@" >&2
}
fatal()
{
    echo '[ERROR] ' "$@" >&2
    exit 1
}


cd /lib/systemd/system
info('Fetching Service............')
wget -qO $GITHUB_URL/orcli.service

info('Installing Service..........')
cd /usr/bin
wget -qO $GITHUB_URL/orcli-service
info('=============== Install Completed ===============')