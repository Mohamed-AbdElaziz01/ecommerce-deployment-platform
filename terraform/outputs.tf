output "instance_public_ip" {
  description = "Public (Elastic) IP of the application server - use this in ansible/inventory.ini"
  value       = aws_eip.app_server.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}

output "ssh_command" {
  description = "Command to SSH into the server"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${aws_eip.app_server.public_ip}"
}

output "app_url" {
  description = "URL to access the platform's API once deployed"
  value       = "http://${aws_eip.app_server.public_ip}:${var.app_port}/api/products"
}

output "grafana_url" {
  description = "URL to access Grafana once deployed"
  value       = "http://${aws_eip.app_server.public_ip}:3000"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket created for backups/static assets"
  value       = aws_s3_bucket.app_storage.bucket
}

output "data_volume_id" {
  description = "EBS volume ID holding persistent MongoDB/Elasticsearch data"
  value       = aws_ebs_volume.data.id
}
