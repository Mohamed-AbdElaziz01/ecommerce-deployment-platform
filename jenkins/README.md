# CI/CD with Jenkins

Automates: on every push to GitHub → syntax-check each service → build Docker
images → deploy via Docker Compose → verify the platform is healthy. On
failure, automatically attempts to restore the stack from the last known-good
images.

This pipeline mirrors exactly how the platform is actually deployed in this
project - locally via `docker-compose.yml`, and on the AWS server provisioned
by Terraform/Ansible (see `../terraform/` and `../ansible/`). It deliberately
avoids requiring `npm`/`kubectl` inside the Jenkins container itself - every
build/test step runs inside short-lived Docker containers instead, so Jenkins
only needs Docker access.

> **Using Kubernetes instead?** A more advanced pipeline that builds, pushes to
> Docker Hub, and runs `kubectl set image` against a Kubernetes cluster (with
> rollback via `kubectl rollout undo`) is kept at `../Jenkinsfile.k8s-advanced.bak`.
> Rename it to `Jenkinsfile` and follow the credentials/kubectl setup notes at
> the bottom of this file if you'd rather deploy to the `k8s/` manifests.

## Pipeline Stages (`Jenkinsfile`)

1. **Checkout** - pulls the latest code from GitHub
2. **Syntax Check** - runs `node --check` on each service's entry point inside
   a throwaway `node:20-alpine` container (no Node.js install needed on Jenkins)
3. **Build Images** - `docker compose build` for all services
4. **Deploy** - `docker compose up -d`, recreating only the containers whose
   images changed (mongo/elasticsearch data volumes are untouched)
5. **Health Check** - polls `web-service`'s `/health/ready` endpoint until it
   responds, failing the build if it doesn't come up within ~50 seconds
6. **Post: rollback on failure** - if any stage fails, runs
   `docker compose up -d --no-build`, which restarts the stack using whatever
   images are currently cached locally (i.e. the last successful build's output,
   since the failed build's images were never tagged over them)

## 1. Run Jenkins locally

> Note: Jenkins UI runs on port `8081` (port `8080` is used by the nginx reverse
> proxy from the main `docker-compose.yml`).

```bash
cd jenkins
docker-compose up -d
```

Get the initial admin password:
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open `http://localhost:8081`, paste the password, and install the **suggested
plugins**.

## 2. Create the Pipeline job

1. **New Item > Pipeline**, name it `ecommerce-pipeline`
2. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: your GitHub repo URL
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
3. Save

## 3. Trigger builds automatically (GitHub webhook)

For Jenkins running locally, GitHub can't reach `localhost` directly. Two options:

### Option A: Poll SCM (simplest for local dev)
In the job config, under **Build Triggers**, check **Poll SCM** and set a schedule,
e.g. `H/5 * * * *` (every 5 minutes).

### Option B: Webhook via a tunnel (e.g. ngrok)
```bash
ngrok http 8081
```
Then in your GitHub repo: **Settings > Webhooks > Add webhook**
- Payload URL: `https://<your-ngrok-id>.ngrok-free.app/github-webhook/`
- Content type: `application/json`
- Event: `Just the push event`

And in the Jenkins job, under **Build Triggers**, check
**GitHub hook trigger for GITScm polling**.

## 4. Run the pipeline

Push a commit, or click **Build Now**. Watch the stages in **Stage View**.

## Rollback behavior

If the build, deploy, or health check stage fails, the `post { failure { ... } }`
block restarts the stack from whatever images are already cached locally on the
Docker host - this is the previous successful build's output, since a failed
build never overwrites the `:latest` tags. This implements the
**"Automated rollback strategies"** deliverable for the Docker Compose
deployment target.

To roll back manually at any time:
```bash
docker compose up -d --no-build
```

## Troubleshooting

**`docker: Permission denied` even after the socket chmod fix**

Check whether `docker` actually exists inside the container as a real binary:
```bash
docker exec jenkins ls -la /usr/bin/docker
```
If that shows a directory instead of a file, an earlier version of
`docker-compose.yml` tried to bind-mount the host's `/usr/bin/docker` binary
into the container - which only works on Linux hosts. On Docker Desktop for
Windows/Mac, that path doesn't exist on the host, so Docker silently mounts an
empty directory there instead, shadowing where the CLI should be. The current
`docker-compose.yml` fixes this by installing the Docker CLI *inside* the
container via its entrypoint instead of mounting it from the host - no action
needed if you're using the version in this repo. If you still see this, rebuild
with `docker-compose down && docker-compose up -d`.

**`permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`**

This happens when the `jenkins` user inside the container can't access the
mounted Docker socket. The `docker-compose.yml` in this folder already fixes
this automatically via a custom `entrypoint` that runs `chmod 666
/var/run/docker.sock` on every container start - so this should not recur
after rebuilding with `docker-compose up -d --build`. If you still hit it
(e.g. you're running an older container), fix it manually with:
```bash
docker exec -u root jenkins chmod 666 /var/run/docker.sock
```

**`npm: not found` / `kubectl: not found` inside pipeline steps**

This means the *advanced Kubernetes variant* (`Jenkinsfile.k8s-advanced.bak`)
is active instead of the Docker Compose one described above. That variant
needs `npm` and `kubectl` available inside the Jenkins container - see the
setup notes below if you want to use it instead.

**`No flow definition, cannot run`**

The job's Pipeline configuration lost its `Repository URL` / `Script Path`
settings. Go to the job's **Configure** page, scroll to the **Pipeline**
section, and re-enter: Definition = `Pipeline script from SCM`, SCM = `Git`,
your repo URL, Branch Specifier = `*/main`, Script Path = `Jenkinsfile`.

## Using the advanced Kubernetes pipeline instead

If you want `kubectl set image` + Docker Hub push instead of `docker compose`:

1. Rename `../Jenkinsfile.k8s-advanced.bak` to `../Jenkinsfile` (replacing this one)
2. Add credentials (**Manage Jenkins > Credentials > Add Credentials**):
   - **Docker Hub**: Kind `Username with password`, ID `dockerhub-credentials`
   - **Kubeconfig**: Kind `Secret file`, ID `kubeconfig` (upload your kubeconfig;
     if it points at `localhost`/`127.0.0.1`, change that to
     `kubernetes.docker.internal` first, so it's reachable from inside the
     Jenkins container)
3. Edit the Jenkinsfile's `DOCKERHUB_NAMESPACE` to your Docker Hub username
4. Install `kubectl` inside Jenkins:
   ```bash
   docker exec -u root jenkins bash -c "curl -LO 'https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl' && chmod +x kubectl && mv kubectl /usr/local/bin/"
   ```
5. Install the **Docker Pipeline** plugin (Manage Jenkins > Plugins)

## Cleanup

```bash
cd jenkins
docker-compose down -v
```
