const mongoose = require('mongoose');
const config = require('../config');

class Database {
    constructor() {
        this.connect();
    }

    // eslint-disable-next-line class-methods-use-this
    connect() {
        mongoose
            .connect(
                `mongodb+srv://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}/${config.DB_NAME}?retryWrites=true&w=majority`
            )
            .then(() => {
                console.log(
                    `Database connection successful to mongodb://${config.DB_HOST}/${config.DB_NAME} as user ${config.DB_USER}`
                );
            })
            .catch((err) => {
                console.error('Database connection error', err);
            });
    }
}

module.exports = new Database();
