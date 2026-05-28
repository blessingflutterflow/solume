import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import { PrismaService } from "../prisma/prisma.service";
import { AwsClientService } from "./aws.client";

@Injectable()
export class LifecycleService {
  constructor(
    private prisma: PrismaService,
    private aws: AwsClientService,
  ) {}

  async start(accountId: string) {
    const { awsInstanceId } = await this.getRunnable(accountId, ["STOPPED"]);
    await this.aws.ec2.send(new StartInstancesCommand({ InstanceIds: [awsInstanceId] }));
    return this.prisma.instance.update({
      where: { accountId },
      data: { state: "RUNNING" },
    });
  }

  async stop(accountId: string) {
    const { awsInstanceId } = await this.getRunnable(accountId, ["RUNNING"]);
    await this.aws.ec2.send(new StopInstancesCommand({ InstanceIds: [awsInstanceId] }));
    return this.prisma.instance.update({
      where: { accountId },
      data: { state: "STOPPED" },
    });
  }

  async reboot(accountId: string) {
    const { awsInstanceId } = await this.getRunnable(accountId, ["RUNNING"]);
    await this.aws.ec2.send(new RebootInstancesCommand({ InstanceIds: [awsInstanceId] }));
    return this.prisma.instance.findUnique({ where: { accountId } });
  }

  async terminate(accountId: string) {
    const { awsInstanceId } = await this.getRunnable(accountId, ["RUNNING", "STOPPED", "FAILED"]);
    await this.aws.ec2.send(new TerminateInstancesCommand({ InstanceIds: [awsInstanceId] }));
    return this.prisma.instance.update({
      where: { accountId },
      data: { state: "TERMINATED" },
    });
  }

  private async getRunnable(accountId: string, allowedStates: string[]) {
    const instance = await this.prisma.instance.findUnique({ where: { accountId } });
    if (!instance) throw new NotFoundException("No instance found for this account");
    if (!instance.awsInstanceId) throw new BadRequestException("Instance has no AWS ID — provisioning may be incomplete");
    if (!allowedStates.includes(instance.state)) {
      throw new BadRequestException(`Instance is ${instance.state} — cannot perform this action`);
    }
    return instance as typeof instance & { awsInstanceId: string };
  }
}
