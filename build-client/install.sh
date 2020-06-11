#!bin/sh

set -e

GITHUB_URL=https://github.com/appveen/friday-ci/build-client



cd /lib/systemd/system
echo "Fetching Service............"
wget -qO $GITHUB_URL/orcli.service

echo "Installing Service.........."
cd /usr/bin
wget -qO $GITHUB_URL/orcli-service
echo "=============== Install Completed ==============="