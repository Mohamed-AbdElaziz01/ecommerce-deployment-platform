variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix used for tagging all resources"
  type        = string
  default     = "ecommerce-platform"
}

variable "instance_type" {
  description = "EC2 instance type for the application server"
  type        = string
  # t3.medium: 2 vCPU / 4 GiB RAM - enough headroom for web+payment+search+nginx+mongo+elasticsearch
  default = "t3.medium"
}

variable "data_volume_size_gb" {
  description = "Size (GiB) of the EBS volume used for persistent MongoDB/Elasticsearch data"
  type        = number
  default     = 20
}

variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair (created in the AWS console) used for SSH access"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to SSH into the instance. Restrict this to your own IP, e.g. \"203.0.113.5/32\""
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Port exposed by Nginx for the application (matches docker-compose.yml)"
  type        = number
  default     = 8080
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone for the subnet and EC2 instance"
  type        = string
  default     = "us-east-1a"
}
