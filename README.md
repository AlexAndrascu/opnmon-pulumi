# An OPNsense Dashboard Infrastructure as Code based on docker + pulumi (typescript). #

Inspired by https://github.com/bsmithio/OPNsense-Dashboard

#### Quick start: ####

Add the required packages:

`yarn add pulumi pulumi-docker crypto`

`yarn install`

Set the following pulumi config vars & secrets:

ElasticSearch username:\
`pulumi config set elastic-user [your-es-username]`

ElasticSearch password:\
`pulumi config set --secret elastic-user [your-es-password]`

InfluxDB username:\
`pulumi config set influx-user [your-influx-username]`

InfluxDB password:\
`pulumi config set --secret influx-password [your-influx-password]`

Graylog root password:\
`pulumi config set --secret grayroot [your-graylog-root-password]`

Grafana username:\
`pulumi config set grafana-user [your-grafana-username]`

Grafana password:\
`pulumi config set --secret grafana-password [your-grafana-password]`

Deploy the infrastructure:

`pulumi up`

Teardown the infrastructure:

`pulumi down`

#### Configuration instructions ####

https://github.com/AlexAndrascu/OPNsense-Dashboard/blob/master/configure.md

Note: You can skip the docker compose part as this is now dealt by pulumi.