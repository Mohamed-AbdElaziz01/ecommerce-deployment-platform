# Terraform: AWS Infrastructure

Provisions the AWS infrastructure for the e-commerce platform: a VPC, an EC2
instance sized to run the entire Docker Compose stack, a persistent EBS volume
for MongoDB/Elasticsearch data, an Elastic IP, and an S3 bucket for backups.

## What gets created

| Resource                          | Purpose                                              |
|--------------------------------------|----------------------------------------------------------|
| VPC + public subnet + internet gateway | Isolated network for the platform                       |
| Security Group                       | Opens ports 22 (SSH), 8080 (app), 3000 (Grafana), 9090 (Prometheus), 8081 (Jenkins) |
| EC2 instance (`t3.medium` by default)  | Runs Docker + the full `docker-compose.yml` stack         |
| EBS volume (20 GiB)                    | Persistent storage for MongoDB/Elasticsearch data         |
| Elastic IP                              | Stable public IP that survives instance stop/start        |
| S3 bucket                                | Versioned, encrypted bucket for backups/static assets     |

This deliberately uses **one EC2 instance running Docker Compose** rather than
EKS/Kubernetes - simpler and cheaper, matching the same `docker-compose.yml`
already used for local development. The `k8s/` manifests remain available if
you later want to move to EKS or self-managed Kubernetes on this same instance
(see `ansible/`'s optional k3s install).

## Prerequisites

1. An AWS account with billing enabled.
2. [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5 installed locally.
3. AWS credentials configured locally. Either:
   ```bash
   aws configure
   ```
   (requires the [AWS CLI](https://aws.amazon.com/cli/)), or set environment
   variables:
   ```bash
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   ```
4. An EC2 key pair created in the AWS Console (**EC2 > Key Pairs > Create key
   pair**), so you can SSH into the instance. Download the `.pem` file and:
   ```bash
   chmod 400 ~/.ssh/your-key.pem   # macOS/Linux
   ```

## 1. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
ssh_key_name      = "your-actual-key-pair-name"
ssh_allowed_cidr  = "YOUR_IP/32"   # find it at https://whatismyipaddress.com/
```

> Leaving `ssh_allowed_cidr` as `0.0.0.0/0` allows SSH/Grafana/Prometheus/Jenkins
> from anywhere on the internet - fine for a quick test, but restrict it to your
> own IP before leaving this running.

## 2. Initialize Terraform

```bash
terraform init
```

## 3. Review the plan

```bash
terraform plan
```

Check the resources listed match what's described above.

## 4. Apply

```bash
terraform apply
```

Type `yes` to confirm. Takes 1-2 minutes.

## 5. Get the outputs

```bash
terraform output
```

You'll see the public IP, SSH command, and app URLs.

## 6. Connect Ansible to the new server

Copy the `instance_public_ip` output into `ansible/inventory.ini`:

```ini
[ecommerce_servers]
app-server ansible_host=<instance_public_ip> ansible_user=ubuntu

[ecommerce_servers:vars]
ansible_ssh_private_key_file=~/.ssh/your-key.pem
```

Then run Ansible to deploy the platform onto this freshly-provisioned server:
```bash
cd ../ansible
ansible-playbook -i inventory.ini site.yml
```

> The EC2 `user_data` script in `ec2.tf` already installs Docker on first boot,
> so Ansible's `docker` role will simply detect it's already installed and move
> on quickly to cloning the repo and deploying via Docker Compose.

## 7. Mount the data volume (one-time, on first deploy)

The EBS data volume is attached but not yet formatted/mounted. SSH in and run:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<instance_public_ip>

sudo mkfs -t ext4 /dev/sdf   # only if this is a brand-new, empty volume
sudo mkdir -p /mnt/ecommerce-data
sudo mount /dev/sdf /mnt/ecommerce-data
echo '/dev/sdf /mnt/ecommerce-data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

Then update `docker-compose.yml`'s volume mounts (`mongo-data`, `es-data`) to
point at subdirectories of `/mnt/ecommerce-data` instead of Docker-managed
volumes, so data survives even if the instance is replaced.

## Cost estimate (us-east-1, approximate)

| Resource          | Approx. monthly cost |
|----------------------|--------------------------|
| `t3.medium` EC2 (on-demand) | ~$30          |
| 20 GiB EBS gp3              | ~$1.60        |
| Elastic IP (attached)        | $0 (free while attached to a running instance) |
| S3 (light usage)              | ~$0.50 or less |

**Total: roughly $30-35/month.** Stop the instance when not in use to avoid EC2
charges (EBS/EIP costs continue while stopped, but are minor). Use the AWS
[Pricing Calculator](https://calculator.aws/) for precise figures in your region.

## Destroy (tear down everything)

```bash
terraform destroy
```

> This permanently deletes the EC2 instance, EBS volume (and all data on it),
> and the S3 bucket (only if empty - delete its contents first if needed).
> Type `yes` to confirm.

## State management note

This setup uses **local state** (a `terraform.tfstate` file on your machine) by
default - fine for solo learning/testing. For team use, uncomment the `backend
"s3"` block in `provider.tf` and create that S3 bucket first (outside of this
same Terraform run, to avoid a chicken-and-egg problem).
