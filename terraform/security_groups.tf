resource "aws_security_group" "app_server" {
  name        = "${var.project_name}-app-sg"
  description = "Security group for the e-commerce platform EC2 instance"
  vpc_id      = aws_vpc.main.id

  # SSH access (restrict to your own IP via ssh_allowed_cidr in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # Application access via Nginx
  ingress {
    description = "App via Nginx"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Jenkins UI (optional - remove if Jenkins runs elsewhere)
  ingress {
    description = "Jenkins UI"
    from_port   = 8081
    to_port     = 8081
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # Grafana UI (restrict to your own IP - change the default admin password!)
  ingress {
    description = "Grafana UI"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # Prometheus UI (restrict to your own IP)
  ingress {
    description = "Prometheus UI"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # All outbound traffic allowed (needed for apt, docker pull, npm install, etc.)
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}
