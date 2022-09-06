import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { createHash } from "crypto";
import { salt } from "./utils/salt";

const timezone = "TZ=GMT";

//FIXME //[ ] move volumes to a separate pulumi infrastructure file and use with pulumi import
// that way you keep the volumes on pulumi down and reattach on pulumi up without resetting the dbs.

const mongodata = new docker.Volume("mongodb_data", {}, { protect: true });
const elasticdata = new docker.Volume("elastic_data", {}, { protect: true });
const influxdata = new docker.Volume("influx_data", {}, { protect: true });
const grafanadata = new docker.Volume("grafana_data", {}, { protect: true });

const graylogdata = new docker.Volume("graylog_data", {
    driver: "local",
    name: "graylog_data",
}, {
    protect: true,
});

const network = new docker.Network("opnmon-net");

//pulumi config setter / getter
const config = new pulumi.Config();


//Mongodb docker image
const mongoImage = new docker.RemoteImage("mongodb-image", {
    name: "mongo:4",
    keepLocally: true, // don't delete the image from the local cache when deleting this resource
});

//Elasticsearch docker image
const elasticImage = new docker.RemoteImage("elasticsearch-image", {
    name: "docker.elastic.co/elasticsearch/elasticsearch:7.17.6", //@TODO See if elastic 8 is working
    keepLocally: true, // don't delete the image from the local cache when deleting this resource
});

//Graylog docker image
const graylogImage = new docker.RemoteImage("graylog-image", {
    name: "graylog/graylog:4.3.5",
    keepLocally: true, // don't delete the image from the local cache when deleting this resource
});

//Influxdb docker image
const influxImage = new docker.RemoteImage("influxdb-image", {
    name: "influxdb:2.4",
    keepLocally: true, // don't delete the image from the local cache when deleting this resource
});

//Grafana docker image
const grafanaImage = new docker.RemoteImage("grafana-image", {
    name: "grafana/grafana:8.5.10",
    keepLocally: true, // don't delete the image from the local cache when deleting this resource
});

//Mongodb docker container
//FIXME //[ ] secure with user / pass

const mongoContainer = new docker.Container("mongo", {
    image: mongoImage.name,
    volumes: [
        { volumeName: mongodata.name, containerPath: '/data/db' }
    ],
    envs: [
        timezone
    ],
    networksAdvanced: [
        { name: network.name, aliases: ["mongo"] },
    ],
    restart: "unless-stopped"
});

//Elasticsearch docker container
//TODO: move more envs to pulumi config

const elasticpass = pulumi.interpolate`ELASTIC_PASSWORD=${config.requireSecret("elastic-password")}`;
const elastiContainer = new docker.Container("elasticsearch", {
    image: elasticImage.name,
    volumes: [
        { volumeName: elasticdata.name, containerPath: '/usr/share/elasticsearch/data' }
    ],
    envs: [
        timezone,
        'http.host=0.0.0.0',
        'transport.host=localhost',
        'network.host=0.0.0.0',
        'xpack.security.enabled: true',
        '"discovery.type=single-node"',
        'ES_JAVA_OPTS=-Xms512m -Xmx512m',
        'ELASTIC_USERNAME=' + config.require("elastic-user"),

    ],
    networksAdvanced: [
        { name: network.name, aliases: ["elasticsearch"] },
    ],
    ports: [{
        internal: 9200,
        external: 9200
    }],
    restart: "unless-stopped"
});

//Graylog docker container
const graysalt = salt(17);
const graystuff = config.require("grayroot");
const grayhash = createHash('sha256').update(graystuff).digest('hex');
const graypass = pulumi.interpolate`GRAYLOG_ROOT_PASSWORD_SHA2=${grayhash}`
const graylogContainer = new docker.Container("graylog", {
    image: graylogImage.name,
    volumes: [
        {
            volumeName: graylogdata.name,
            containerPath: '/usr/share/graylog/data',
        },
    ],
    envs: [
        timezone,
        'ROOT_TIMEZONE=' + timezone,
        'GRAYLOG_TIMEZONE=' + timezone,
        'GRAYLOG_PASSWORD_SECRET=' + graysalt,
        graypass,
        'GRAYLOG_HTTP_EXTERNAL_URI=http://127.0.0.1:9000/'
    ],
    entrypoints: [
        "/docker-entrypoint.sh"
    ],
    networksAdvanced: [
        { name: network.name, aliases: ["graylog"] },
    ],
    ports: [{
        internal: 9000,
        external: 9000
    }, {
        protocol: "udp",
        internal: 1514,
        external: 1514
    },{
        internal:1514,
        external:1514
    }],
    restart: "unless-stopped",
});

//Influxdb docker container
const influxContainer = new docker.Container("influxdb", {
    image: influxImage.name,
    volumes: [
        { volumeName: influxdata.name, containerPath: '/var/lib/influxdb2' }
    ],
    envs: [
        timezone
    ],
    networksAdvanced: [
        { name: network.name, aliases: ["influxdb"] },
    ],
    ports: [{
        internal: 8086,
        external: 8086
    }],
    restart: "unless-stopped"
}, { dependsOn: [mongoContainer, elastiContainer] });

//Grafana docker container
const grafanapass = pulumi.interpolate`GF_SECURITY_ADMIN_PASSWORD=${config.requireSecret("grafana-password")}`;
const grafanaContainer = new docker.Container("grafana", {
    image: grafanaImage.name,
    volumes: [
        { volumeName: grafanadata.name, containerPath: '/var/lib/grafana' }
    ],
    envs: [
        timezone,
        'GF_SECURITY_ADMIN_USER=' + config.require("grafana-user"),
        grafanapass,
        'GF_INSTALL_PLUGINS=grafana-worldmap-panel'
    ],
    networksAdvanced: [
        { name: network.name, aliases: ["grafana"] },
    ],
    ports: [{
        internal: 3000,
        external: 3000
    }],
    restart: "unless-stopped"
}, { dependsOn: [influxContainer] });

