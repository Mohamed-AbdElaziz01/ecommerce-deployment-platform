terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment to store state remotely in S3 instead of locally (recommended
  # once you're working with a team or want state to survive a local wipe).
  # You must create this bucket first (see s3.tf for an example bucket resource
  # you could use, created in a separate bootstrap step).
  #
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "ecommerce-platform/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
