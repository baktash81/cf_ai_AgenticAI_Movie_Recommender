# GitHub Actions Self-Hosted Runner Troubleshooting

## Problem
GitHub Actions workflow is queued but the self-hosted runner is not picking it up.

## Root Cause
The self-hosted runner service is not running on your production server.

## Solution Steps

### 1. SSH into Your Production Server
```bash
ssh user@movie.baktashans.com
# Replace with your actual server address
```

### 2. Locate the Runner Installation
```bash
# Common locations:
ls -la ~/actions-runner
# OR
ls -la /opt/actions-runner
# OR
find ~ -name "actions-runner" -type d
```

### 3. Check Runner Status
```bash
cd ~/actions-runner  # or wherever it's installed

# Check if process is running
ps aux | grep Runner.Listener

# If configured as service:
sudo ./svc.sh status
```

### 4. Start the Runner

#### Option A: Start as Service (Recommended for Production)
```bash
cd ~/actions-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

#### Option B: Run Interactively (For Testing)
```bash
cd ~/actions-runner
./run.sh
```

### 5. Verify Runner is Connected
1. Go to GitHub: https://github.com/baktash81/AgenticAI_Movie_Recommender/settings/actions/runners
2. Check if your runner shows as **"Idle"** (green circle)
3. If it shows "Offline" (gray), the runner is not connected

### 6. View Runner Logs
```bash
# If running as service:
sudo journalctl -u actions.runner.* -f

# Or check log files:
cd ~/actions-runner
tail -f _diag/Runner_*.log
```

## If Runner is Not Installed

### Install New Self-Hosted Runner

1. **Go to GitHub Repository Settings:**
   - Navigate to: https://github.com/baktash81/AgenticAI_Movie_Recommender/settings/actions/runners
   - Click "New self-hosted runner"
   - Select "Linux" and follow the commands

2. **Example Installation (Linux):**
   ```bash
   # Download
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

   # Configure (GitHub will provide the token)
   ./config.sh --url https://github.com/baktash81/AgenticAI_Movie_Recommender --token YOUR_TOKEN

   # Install as service
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

3. **Verify Installation:**
   ```bash
   sudo ./svc.sh status
   ```

## Common Issues

### Issue: "Runner is offline"
**Solution:**
- Check if the process is running: `ps aux | grep Runner.Listener`
- Restart the service: `sudo ./svc.sh restart`
- Check logs for errors: `tail -f _diag/Runner_*.log`

### Issue: "Authentication failed"
**Solution:**
- Re-register the runner with a fresh token from GitHub
- Remove old runner: `./config.sh remove --token YOUR_REMOVE_TOKEN`
- Re-configure: `./config.sh --url ... --token NEW_TOKEN`

### Issue: "Service not found"
**Solution:**
- Install the service: `sudo ./svc.sh install`
- Start it: `sudo ./svc.sh start`

### Issue: "Permission denied"
**Solution:**
- Ensure the user running the runner has permissions for:
  - `/var/www/movie.baktashans.com/`
  - nginx reload: `sudo usermod -aG www-data $USER`
  - Add to sudoers for specific commands if needed

## Quick Health Check Commands

Run these on your production server:

```bash
# Check if runner process is running
ps aux | grep "Runner.Listener" | grep -v grep

# Check service status
sudo ./svc.sh status

# View last 50 lines of runner logs
cd ~/actions-runner
tail -50 _diag/Runner_*.log | grep -i error

# Test GitHub connectivity
curl -I https://api.github.com
```

## Expected Output When Healthy

```
$ sudo ./svc.sh status
● actions.runner.baktash81-AgenticAI_Movie_Recommender.your-runner-name.service - GitHub Actions Runner
     Loaded: loaded
     Active: active (running)
```

## After Fixing

1. Verify runner shows as "Idle" in GitHub
2. Re-run the queued workflow or push a new commit
3. Monitor the workflow execution in GitHub Actions tab

## Need More Help?

- Check GitHub Actions logs: https://github.com/baktash81/AgenticAI_Movie_Recommender/actions
- GitHub Runner documentation: https://docs.github.com/en/actions/hosting-your-own-runners
