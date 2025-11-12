# Online Chat Room

## 📖 Project Introduction
Online Chat Room is a feature-rich real-time communication application developed based on Node.js and Vue 3. It not only supports basic functions like multi-user real-time chat, image sharing, message quoting, and emoji packs, but also integrates advanced features such as a points system, red packet functionality, mystery shop, virtual pets, and music playback. This project adopts a front-end and back-end separation architecture, uses Socket.io for real-time communication, and supports both web and Electron desktop clients, providing a simple and friendly user interface and stable, reliable server-side support.

## 🚀 Features

### Core Chat Features
- **Real-time Chat**: Supports multi-user simultaneous online real-time communication
- **User Management**: User join/leave notifications, online user list display
- **Message Types**: Supports sending text messages and image messages
- **Message Quoting**: Supports quoting replies to other users' messages
- **@Mention Function**: Supports @ specific users
- **User Nickname**: Supports customizing and modifying user nicknames
- **Admin Functions**: Supports kicking users, muting and other management operations
- **Star-style Replies**: Supports AI-generated celebrity-style replies

### Media Features
- **Image Upload**: Supports uploading JPG, PNG, GIF, and WebP format images
- **Dynamic Emojis**: Built-in various dynamic emojis for users to choose from
- **Emoji Packs**: Supports categorized viewing and use of emoji packs

### Points & Economy System
- **Points System**: Users can earn points through online time, daily check-ins, etc.
- **Daily Check-in**: Supports claiming daily point rewards
- **Red Packet Function**: Supports sending regular and random red packets with customizable blessings
- **Red Packet Claiming**: Real-time display of red packet claiming status and remaining amount
- **Points History**: Records user points change history

### Mystery Shop
- **Lottery System**: Users can use points to participate in lottery draws
- **Multiple Rewards**: Including avatar frames, SVIP privileges, login animations, and other virtual items
- **Reward Expiration**: Some rewards have time limits and automatically expire when due
- **Punishment Mechanism**: Includes "black bomb" and other punishment mechanisms to increase fun

### Virtual Pet
- **Pet Companion**: Provides cute virtual pets to accompany users
- **Interaction Function**: Supports clicking pets for interaction
- **Message Reminders**: Pets display various messages and reminders
- **Drag and Move**: Supports dragging pets to any position on the screen

### Music Features
- **Online Music**: Integrates third-party music services for online playback
- **Multiple Music Sources**: Supports switching between different music sources
- **Music Control**: Provides music playback control interface

### Personalization Settings
- **Theme Switching**: Supports multiple theme color switching
- **Music Source Configuration**: Can customize music source addresses
- **Client ID**: Supports configuring client identity
- **Admin Mode**: Supports activating admin functions

### System Management
- **CDN Directory Monitoring**: Automatically monitors image storage directory size and cleans up old files when threshold is exceeded
- **Service Restart Cleanup**: Automatically cleans up CDN image directories on service restart to free up storage space
- **Chat History**: Automatically saves the last 100 chat records
- **User Cleanup**: Periodically cleans up long-term inactive user accounts

## 🛠 Technology Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework
- **Socket.io**: Real-time communication library
- **Multer**: File upload middleware
- **UUID**: Generate unique identifiers

### Frontend
- **Vue 3**: JavaScript framework
- **Vite**: Build tool
- **Element Plus**: UI component library
- **Socket.io-client**: Socket.io client

### Desktop Client
- **Electron**: Cross-platform desktop application framework

## 📦 Installation Guide

### Environment Requirements
- Node.js 14.x or higher
- npm 6.x or higher

### Installation Steps

1. **Clone the Project**
```bash
# Clone the project code
git clone [project address]
cd chat-on-web
```

2. **Install Backend Dependencies**
```bash
# Execute in the project root directory
npm install
```

3. **Install Frontend Dependencies**
```bash
# Enter the frontend directory
cd frontend
npm install
# Return to root directory
cd ..
```

### Docker Startup

1. Get the latest image

```bash
docker pull ty13363959807/chat-on-web:latest
```

2. Start
   
```bash
docker run -d --name chat-room --net host \
    -e PORT=3000 \
    -e BIND_ADDRESS=0.0.0.0 \
    -e CDN_SIZE_LIMIT_MB=2048 \
    ty13363959807/chat-on-web:latest
```

3. Supported env
   
| Name | Description |
|---|---|
| PORT | Listening port |
| BIND_ADDRESS | Listening address |
| CDN_SIZE_LIMIT_MB | Maximum size of image cache directory, in MB |

## 🚀 Usage Instructions

### Electron Desktop Client

The project supports an Electron desktop client, providing a more stable user experience and system integration features.

#### Configuration Instructions
The Electron client is configured through the `electron/conf.json` file, with main configuration items including server address, etc.

#### Minimum Window Size
The client has set a minimum width of 800px and a minimum height of 600px to ensure a good user experience.

### Web Development Environment

1. **Start Backend Service (Development Mode)**
```bash
# Execute in the project root directory
npm run dev
# This will start the server using nodemon with hot reload support
```

2. **Start Frontend Development Server**
```bash
# Open a new terminal, enter the frontend directory
cd frontend
npm run dev
```

3. **Access the Application**
Open your browser and visit `http://localhost:5173` (or the address shown in the frontend console)

### Production Environment

1. **Build Frontend Application**
```bash
# Execute in the project root directory
npm run build
# This will automatically install frontend dependencies and build the frontend application
```

2. **Start Backend Service**
```bash
# Execute in the project root directory
npm start
# Or use process management tools like PM2
```

3. **Access the Application**
Open your browser and visit `http://localhost:3000` (or the server's IP address)

### Environment Variable Configuration

- **PORT**: Server port, default 3000
- **BIND_ADDRESS**: Binding address, default 0.0.0.0
- **CDN_SIZE_LIMIT_MB**: CDN image directory size limit (MB), default 500MB

## 📁 Project Structure

```
chat-on-web/
├── .github/             # GitHub configuration directory
│   └── workflows/       # GitHub Actions workflows
├── cdn-images/          # CDN image storage directory
├── data/                # Data storage directory
│   ├── emojis/          # Emoji pack resources
│   ├── images/          # Image resources
│   ├── notice.md        # Notice content
│   ├── points.json      # Points data
│   ├── redPackets.json  # Red packet data
│   ├── mysteryShop.json # Mystery shop data
│   └── stars.json       # Star-style reply configuration
├── electron/            # Electron desktop application directory
│   ├── application.ico  # Application icon
│   ├── conf.json        # Client configuration file
│   ├── favicon.ico      # Website icon
│   └── main.js          # Electron main process file
├── electron-icon.svg    # Electron icon source file
├── frontend/            # Frontend project directory
│   ├── index.html       # Entry HTML file
│   ├── src/             # Frontend source code
│   │   ├── App.vue      # Root component
│   │   ├── Chat.vue    # Chat room main component
│   │   ├── components/  # Vue components
│   │   │   ├── Menu.vue      # Menu component
│   │   │   ├── Music.vue     # Music component
│   │   │   ├── Setting.vue   # Settings component
│   │   │   └── VirtualPet.vue # Virtual pet component
│   │   ├── views/       # Page views
│   │   │   ├── Profile.vue   # Personal profile page
│   │   │   └── Frame.vue     # Website navigation page
│   │   ├── main.js      # Entry file
│   │   ├── styles/      # Style files
│   │   └── utils/       # Utility functions
│   └── vite.config.js   # Vite configuration file
├── src/                 # Backend source code
│   ├── app.js           # Express application configuration
│   ├── config/          # Configuration files
│   │   ├── aiConfig.json # AI configuration file
│   │   └── constants.js  # Constants definition
│   ├── middleware/      # Middleware
│   │   └── auth.js      # Authentication middleware
│   ├── routes/          # Route definitions
│   │   ├── api.js       # API routes
│   │   └── index.js     # Home page route
│   ├── services/        # Business logic
│   │   ├── pointsService.js    # Points service
│   │   ├── redPacketService.js # Red packet service
│   │   ├── starReplyService.js # Star-style reply service
│   │   ├── mysteryShopService.js # Mystery shop service
│   │   ├── storageService.js   # Storage service
│   │   └── userService.js      # User service
│   └── websocket/       # WebSocket handling
│       └── socketHandler.js    # Socket event handling
├── server.js            # Backend entry file
├── README.md            # Project documentation (Chinese)
└── README.en.md         # Project documentation (English)
```

## 🔧 Feature Details

### User System
- **User Join**: Enter a username to join the chat room
- **User List**: Real-time display of currently online users
- **Nickname Modification**: Supports modifying user nicknames, all historical messages will also be updated synchronously
- **User Identity**: Each user has a unique userId and coreId, coreId is used for the points system
- **User Status**: Displays user online status, points, privileges, and other information

### Chat Features
- **Send Messages**: Enter text and press Enter to send messages
- **Quote Replies**: Right-click on a message to select quote reply
- **@Mention**: Use the @ symbol to mention specific users, who will receive notifications
- **Image Sharing**: Supports uploading and sharing images
- **Emoji Packs**: Supports sending various emoji packs
- **Message History**: Automatically saves the last 100 chat records

### Points System
- **Earning Points**:
  - Get 10 points for every hour online
  - Daily check-in can get 100 points
  - Claiming red packets may get points
- **Using Points**:
  - Sending red packets requires consuming points
  - Mystery shop lottery requires 100 points
- **Points Records**: The system will record user points change history

### Red Packet Function
- **Red Packet Types**:
  - Regular red packet: Each recipient gets the same amount
  - Random red packet: Each recipient gets a random amount
- **Red Packet Settings**:
  - Set total points and number of red packets
  - Add blessing message
- **Red Packet Status**:
  - Active: Claimable state
  - Expired: Not fully claimed within 24 hours
  - Fully Claimed: All red packets have been claimed

### Mystery Shop
- **Lottery Mechanism**: Each lottery draw consumes 100 points
- **Reward Types**:
  - Exquisite avatar frame (3-day usage right)
  - SVIP privilege (3-day usage right)
  - Login cool animation (3-day usage right)
  - Points reward (200/500/1000 points)
  - Black bomb (loss of 200 points)
- **Reward Probability**: Different rewards have different acquisition probabilities

### Virtual Pet
- **Pet Selection**: Supports selecting different pet images
- **Pet Interaction**: Clicking pets can trigger interactions
- **Message Display**: Pets will display various messages and reminders
- **Position Adjustment**: Supports dragging pets to any position on the screen

### Music Features
- **Music Sources**: Supports multiple online music sources
- **Music Playback**: Provides music playback interface
- **Source Switching**: Supports switching music sources in settings

### Personalization Settings
- **Theme Switching**: Supports multiple theme colors
- **Music Source Configuration**: Can customize music source addresses
- **Client ID**: Supports configuring client identity
- **Admin Mode**: Click the version number 10 times consecutively to activate

## 🎮 Advanced Features

### AI Integration
- **Star-style Replies**: Supports AI-generated celebrity-style replies
- **AI Configuration**: Can set AI interface parameters through configuration files
- **Local Fallback**: When AI is unavailable, use locally generated replies

### Admin Functions
- **Kick Users**: Supports kicking users from the chat room
- **Mute Settings**: Can set mute duration
- **User Management**: View and manage online users

### Data Management
- **Automatic Cleanup**: Periodically cleans up expired data and long-term inactive users
- **Data Backup**: Important data is persistently stored
- **Storage Monitoring**: Monitors CDN directory size and automatically cleans up

## 🌟 Highlights

1. **Rich Interactive Features**: Not only supports basic chat, but also includes gamification elements like points, red packets, and lottery
2. **Personalized Experience**: Supports theme switching, virtual pets, personalized avatar frames, etc.
3. **Multi-platform Support**: Supports both web and Electron desktop clients
4. **AI Integration**: Supports AI-generated replies to enhance chat experience
5. **Complete System**: Includes complete functions like user management, data cleanup, and storage monitoring

## 📝 Changelog

### v1.0.0
- Initial version release
- Implemented basic chat functionality
- Added image sharing and emoji packs
- Integrated points system and red packet functionality
- Implemented mystery shop and virtual pets
- Added music playback functionality
- Support for Electron desktop client

## 🤝 Contributing Guide

Welcome to submit Issues and Pull Requests to improve the project.

## 📄 License

This project is licensed under the ISC License.
