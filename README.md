# BetterEats

BetterEats is a mobile-first health and nutrition application made to help users improve their lifestyle by providing nutritional insights, meal planning, and fitness tracking. Our goal is to create a simple app yet a powerful tool that uses AI and modern design to help users live a more healthy lifestyle.

---

## Features

- **Meal Logging & Analysis**: Allows users to log meals manually and allows users to take pictures of meals that has AI powered porition and nutrition estimation. 
- **Personalilzed Recommendations**: Track calories, macros, and progress with tailored insights to help users lose weight, gain muscle, or just to maintain a healthy lifestyle
- **User Profiles**: Has a profile system that includes the users weight,BMI,and friends. 
- **Device Integration**: Syncs with Apple Watch, Fitbit, and health apps.
- **Data-Driven Insights**: Uses data analysis to provide health recommendations. 

---

## Goals 

- Develop a full-stack mobile app for fitness and nutrition
- Implement AI to identify foods in meal
- Strengthen team skills in data analysis, AI, and back-end development

## Installation and Setup

To get started with Better Eats, follow these steps:

## Preliminary Steps: 

### Preliminary Step 1 

Make sure you have node installed

### Preliminary Step 2

Make sure you have Expo CLI installed

### Preliminary Step 3

Make sure you have one of the following installed: XCode, or AndroidStudio

### Preliminary Step 4

Navigate to App Store on your device and download the Expo Go on your Android or Apple Device

### 1. Navigate to the `prototype2` Folder

Open your terminal and change your directory to the `CapstoneProject` folder of the project:

```bash
cd CapstoneProject
```

### 2. Install Dependencies

Run the following command to install all the necessary packages:

```bash
npm install
```

### 3. Launch the Application

Start the application by running:

```bash
npm start
```

### 4. XCode Only

Open XCode and navigate to Settings. 
1. In Settings navigate to Locations
2. In Locations navigate to Command Line Tools
3. In Command Line Tools click on the dropdown field and select the only option

Navigate back to your terminal and click i

If you get an error, execute these commands in a seperate terminal window

xcrun simctl shutdown all || true          
xcrun simctl delete unavailable
xcrun simctl create "iPhone 17 Pro (Local)" \
com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro \
  com.apple.CoreSimulator.SimRuntime.iOS-26-0
xcrun simctl boot "iPhone 17 Pro (Local)"

And then navigate to your original terminal and press i again

### 5. Expo Go App Only

1. Open your camera
2. Scan the QR code in your terminal, you will be navigated to the Expo Go App
3. Allow "Expo Go" to find devices on local networks
4. Click Continue




