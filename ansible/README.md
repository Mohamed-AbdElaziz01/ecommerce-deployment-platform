# Ansible Provisioning

Provisions a fresh Ubuntu server (e.g. an AWS EC2 instance, once Terraform creates
it) and deploys the e-commerce platform with a single command.

## What it does

1. **`docker` role** - installs Docker Engine, the Compose plugin, and adds the
   remote user to the `docker` group.
2. **`kubectl` role** - installs the `kubectl` CLI. Optionally installs **k3s**
   (a lightweight single-node Kubernetes distribution) if you want to run the
   `k8s/` manifests on this same server instead of (or in addition to)
   Docker Compose.
3. **`app-deploy` role** - clones this repository, creates `.env` files from the
   `.env.example` templates (generating a random `JWT_SECRET`), and runs
   `docker compose up -d` to bring the whole platform online. Waits for the
   `/api/products` endpoint to respond before finishing.

## Prerequisites (on your control machine, not the server)

```bash
pip install ansible --break-system-packages
ansible-galaxy collection install -r requirements.yml
```

You'll also need SSH access to the target server (a `.pem` key for AWS EC2, or
any SSH key for another VM/cloud provider).

## 1. Configure the inventory

Edit `inventory.ini`:

```ini
[ecommerce_servers]
app-server ansible_host=<YOUR_SERVER_IP> ansible_user=ubuntu

[ecommerce_servers:vars]
ansible_ssh_private_key_file=~/.ssh/your-key.pem
```

## 2. Configure variables

Edit `group_vars/ecommerce_servers.yml`:

```yaml
repo_url: https://github.com/<your-username>/<your-repo>.git
repo_branch: main
install_k3s: false   # set true if you want Kubernetes on this server too
```

## 3. Test connectivity

```bash
ansible -i inventory.ini ecommerce_servers -m ping
```

Expected output: `pong`.

## 4. Run the playbook

```bash
ansible-playbook -i inventory.ini site.yml
```

This takes a few minutes on first run (installing Docker, cloning the repo,
pulling/building images, starting Elasticsearch).

### Run only part of it

```bash
# Just install Docker
ansible-playbook -i inventory.ini site.yml --tags docker

# Just (re)deploy the app (e.g. after a `git push`)
ansible-playbook -i inventory.ini site.yml --tags deploy
```

## 5. Access the platform

After a successful run, the playbook prints the access URLs. By default:

- API (via Nginx): `http://<SERVER_IP>:8080/api/products`
- Search: `http://<SERVER_IP>:8080/api/search/products?q=test`

> Remember to seed sample data and build the search index on first deploy:
> ```bash
> ssh ubuntu@<SERVER_IP>
> cd /opt/ecommerce-platform
> docker compose exec web npm run seed
> docker compose exec search-service npm run reindex
> ```

## Optional: Kubernetes on the same server (k3s)

Set `install_k3s: true` in `group_vars/ecommerce_servers.yml` and re-run the
playbook. Once k3s is running, you can apply the `k8s/` manifests from this repo:

```bash
ssh ubuntu@<SERVER_IP>
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
cd /opt/ecommerce-platform
bash k8s/deploy.sh
```

## Re-running / idempotency

The playbook is safe to re-run. `docker compose ... pull: always` will pull newer
image tags (useful after Jenkins pushes a new build), and `state: present` will
recreate only the containers whose images changed.

## Security notes

- The generated `JWT_SECRET` is random per-deployment - don't lose it, or active
  sessions will be invalidated on redeploy.
- Change the default Grafana password (`admin`/`admin`) before exposing port
  `3000` publicly.
- Restrict security group / firewall rules to only the ports you need
  (typically `8080` for the API, `22` for SSH).
