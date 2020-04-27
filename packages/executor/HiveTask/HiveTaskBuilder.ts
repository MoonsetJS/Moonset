import {IHive} from "@moonset/model";
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import {FileAsset, StringAsset} from "../lib/cdk/asset";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import {MoonsetConstants as MC} from "../lib/constants";

const HiveSQLNotExistError = "Either sqlFile or sql must exist for hive.";
const s3Prefix = "s3://";

export class HiveTaskBuilder {

    static createHiveTask(scope:cdk.Construct, hive:IHive):sfn.Task {
        let s3File;
        if (hive.sqlFile) {
            s3File = hive.sqlFile;
            if (!hive.sqlFile.startsWith(s3Prefix)) {
                s3File = new FileAsset(scope, this.buildSqlFileID(), {
                    path: hive.sqlFile,
                }).getS3Path();
            }
        } else if (hive.sql) {
            s3File = new StringAsset(scope, this.buildSqlFileID(), {
                content: hive.sql,
            }).getS3Path();
        } else {
            throw Error(HiveSQLNotExistError);
        }

        return this.buildHiveTask(scope, s3File, this.buildTaskID());
    }

    private static buildSqlFileID():string {
        return 'HiveSql'
    }

    private static buildTaskID():string {
        return 'HiveTask';
    }

    private static buildHiveTask(scope:cdk.Construct, hiveSQLFile:string, id:string):sfn.Task {
         let emrTask = new sfn.Task(scope, id, {
            task: new sfnTasks.EmrAddStep({
                clusterId: sfn.Data.stringAt('$.EmrSettings.ClusterId'),
                name: 'HiveTask',
                jar: MC.SCRIPT_RUNNER,
                args: [
                    's3://elasticmapreduce/libs/hive/hive-script',
                    '--run-hive-script',
                    '--args',
                    '-f',
                    hiveSQLFile,
                ],
                actionOnFailure: sfnTasks.ActionOnFailure.TERMINATE_CLUSTER,
                integrationPattern: sfn.ServiceIntegrationPattern.SYNC,
            }),
            resultPath: sfn.DISCARD,
        });
         return emrTask;
    }
}