FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# is u done want to use migrations u can run the below command and edit the run command..
# RUN mkdir -p database && \
#     node -e "const sqlite3=require('sqlite3');const db=new sqlite3.Database('./database/data.db');db.run('CREATE TABLE IF NOT EXISTS userData(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, topic TEXT, resources TEXT, feedback TEXT, aiRes TEXT);db.close();');"

EXPOSE 3000
CMD npx knex migrate:latest && node server.js
