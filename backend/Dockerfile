# Use the official Node.js image as the base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the server will listen on
EXPOSE 3000

# Install PM2 globally
RUN npm install -g pm2

# Start the server using PM2
CMD ["pm2-runtime", "start", "npm", "--", "start"]
