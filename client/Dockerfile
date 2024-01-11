# Use the official Node.js 16 image as the base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the Angular app for production
RUN npm run ng build --configuration=production

# Use Nginx as the web server
FROM nginx

# Copy the built Angular app to the Nginx default public directory
COPY --from=0 /app/dist /usr/share/nginx/html

# Expose the port that the Angular app will run on
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
