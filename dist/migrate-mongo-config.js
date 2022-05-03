"use strict";
const database_1 = require("./utils/database");
module.exports = {
    mongodb: {
        url: (0, database_1.getMongoUri)(),
        databaseName: process.env.MONGODB_NAME
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'migrations',
    migrationFileExtension: '.ts',
    useFileHash: false,
    moduleSystem: 'commonjs'
};
//# sourceMappingURL=migrate-mongo-config.js.map