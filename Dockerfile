FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Patch socket.io 0.9.16 for Node 22 compat
RUN find node_modules/socket.io -name '*.js' \
    -exec sed -i 's/\([a-zA-Z.]*\.prototype\)\.__proto__\s*=\s*\([a-zA-Z.]*\.prototype\)\s*;/Object.setPrototypeOf(\1, \2);/g' {} \; \
    && find node_modules/socket.io -name '*.js' \
    -exec sed -i 's/\([a-zA-Z.]*\.prototype\)\.__proto__\s*=\s*\([a-zA-Z.]*\)\s*;/Object.setPrototypeOf(\1, \2);/g' {} \; \
    && find node_modules/socket.io -name '*.js' \
    -exec sed -i 's/process\.EventEmitter/require('\''events'\'')/g' {} \; \
    && find node_modules/policyfile -name '*.js' \
    -exec sed -i 's/process\.EventEmitter/require('\''events'\'')/g' {} \;

COPY . .

ENV NODE_ENV=production
EXPOSE 3090

CMD ["node", "app.js"]
