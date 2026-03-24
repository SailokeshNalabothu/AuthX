# Step 1: Base Linux OS image with Node pre-installed
FROM node:20-alpine

# Step 2: Establish the React workspace
WORKDIR /app

# Step 3: Copy package dependencies
COPY package*.json ./

# Step 4: Force clean dependency construction
RUN npm install

# Step 5: Pull the rest of the frontend source code
COPY . .

# Step 6: Expose development port
EXPOSE 3000

# Step 7: Run the React start script
CMD ["npm", "start"]
