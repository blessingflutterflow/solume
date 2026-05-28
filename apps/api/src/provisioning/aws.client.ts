import { EC2Client } from "@aws-sdk/client-ec2";
import { Route53Client } from "@aws-sdk/client-route-53";
import { SSMClient } from "@aws-sdk/client-ssm";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AwsClientService {
  readonly ec2: EC2Client;
  readonly route53: Route53Client;
  readonly ssm: SSMClient;

  constructor(private config: ConfigService) {
    const region = config.getOrThrow<string>("AWS_REGION");
    const credentials = {
      accessKeyId: config.getOrThrow<string>("AWS_ACCESS_KEY_ID"),
      secretAccessKey: config.getOrThrow<string>("AWS_SECRET_ACCESS_KEY"),
    };

    this.ec2 = new EC2Client({ region, credentials });
    this.route53 = new Route53Client({ region: "us-east-1", credentials });
    this.ssm = new SSMClient({ region, credentials });
  }
}
