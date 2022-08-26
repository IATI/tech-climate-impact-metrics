import mongoose from 'mongoose';
import config from '../config.js';

class Database {
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

export default new Database();
