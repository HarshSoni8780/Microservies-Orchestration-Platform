# Terraform — Microservices Orchestration Platform

Infrastructure as Code for provisioning the AWS infrastructure that powers the Microservices Orchestration Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          VPC (10.0.0.0/16)                  │
│                                                             │
│  ┌──────────────────────┐   ┌──────────────────────┐        │
│  │   Public Subnet AZ-a │   │   Public Subnet AZ-b │        │
│  │   (10.0.1.0/24)      │   │   (10.0.2.0/24)      │        │
│  │   • NAT Gateway      │   │   • Load Balancers   │        │
│  └──────────────────────┘   └──────────────────────┘        │
│           │                          │                      │
│           ▼ (NAT)                    │                      │
│  ┌──────────────────────┐   ┌──────────────────────┐        │
│  │  Private Subnet AZ-a │   │  Private Subnet AZ-b │        │
│  │  (10.0.10.0/24)      │   │  (10.0.20.0/24)      │        │
│  │  • EKS Worker Nodes  │   │  • EKS Worker Nodes  │        │
│  │  • RDS (Multi-AZ)    │   │  • RDS Standby       │        │
│  └──────────────────────┘   └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Resources Created

| Resource | Description |
|----------|-------------|
| **VPC** | Virtual Private Cloud with DNS support |
| **Subnets** | 2 public + 2 private across 2 AZs |
| **Internet Gateway** | Public internet access for public subnets |
| **NAT Gateway** | Outbound internet for private subnets |
| **EKS Cluster** | Managed Kubernetes control plane |
| **EKS Node Group** | Auto-scaling managed worker nodes |
| **RDS PostgreSQL** | PostgreSQL 16 with encrypted gp3 storage |
| **Secrets Manager** | Secure storage for DB credentials |

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- [AWS CLI](https://aws.amazon.com/cli/) v2, configured with appropriate credentials
- [kubectl](https://kubernetes.io/docs/tasks/tools/) for Kubernetes cluster management
- An AWS account with sufficient permissions (VPC, EKS, RDS, IAM, Secrets Manager)

## Quick Start

### 1. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your desired values
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Execution Plan

```bash
terraform plan
```

### 4. Apply the Infrastructure

```bash
terraform apply
```

### 5. Connect to the EKS Cluster

After provisioning completes, configure `kubectl`:

```bash
# The exact command is also shown in the Terraform outputs
aws eks update-kubeconfig --region us-east-1 --name microservices-orchestration-eks
```

Verify connectivity:

```bash
kubectl get nodes
kubectl get namespaces
```

## Remote State (Recommended for Teams)

For team collaboration, enable the S3 backend by uncommenting the `backend` block in `providers.tf`. You will need to create the S3 bucket and DynamoDB table beforehand:

```bash
# Create state bucket
aws s3api create-bucket \
  --bucket microservices-orchestration-tf-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket microservices-orchestration-tf-state \
  --versioning-configuration Status=Enabled

# Create lock table
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Accessing the Database

The database password is auto-generated and stored in **AWS Secrets Manager**. Retrieve it with:

```bash
aws secretsmanager get-secret-value \
  --secret-id microservices-orchestration/production/db-password \
  --query SecretString --output text | jq .
```

## Destroying Infrastructure

```bash
# For dev environments (if db_skip_final_snapshot = true):
terraform destroy

# For production: ensure backups are current before destroying
terraform destroy
```

## ⚠️ Cost Warning

This infrastructure provisions **billable AWS resources**, including:

| Resource | Estimated Monthly Cost |
|----------|----------------------|
| NAT Gateway | ~$32 + data transfer |
| EKS Cluster | ~$73 |
| EKS Nodes (2× t3.medium) | ~$61 |
| RDS (db.t3.micro) | ~$13 |
| **Estimated Total** | **~$180/month** |

> Costs vary by region and usage. Always run `terraform plan` before `terraform apply` and destroy resources when not in use. Use `terraform destroy` to tear down all resources.

## File Structure

```
terraform/
├── README.md                  # This file
├── providers.tf               # Provider configuration and backend
├── variables.tf               # Input variable definitions
├── vpc.tf                     # VPC, subnets, gateways, route tables
├── eks.tf                     # EKS cluster, node group, IAM roles
├── rds.tf                     # RDS PostgreSQL, security group, secrets
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example variable values
└── terraform.tfvars           # Your local variable overrides (git-ignored)
```
