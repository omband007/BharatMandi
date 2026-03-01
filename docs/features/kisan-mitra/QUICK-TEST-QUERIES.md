# Kisan Mitra - Quick Test Queries

## 🚀 Quick Start
1. Open: http://localhost:3000/kisan-mitra-test.html
2. Select your language
3. Try the queries below!

## 📊 Crop Price Queries (NEW: Farm Gate + Retail Prices!)

### English
```
What is the price of tomato?
Tell me potato prices
How much is onion selling for?
What is the current rate for wheat?
Show me rice prices
```

### Hindi (हिन्दी)
```
टमाटर का भाव क्या है?
आलू की कीमत बताओ
प्याज का रेट क्या है?
गेहूं का भाव बताइए
चावल की कीमत क्या है?
```

### Marathi (मराठी)
```
टोमॅटोची किंमत काय आहे?
बटाट्याचा भाव काय आहे?
कांद्याची किंमत सांगा
गव्हाचा भाव काय आहे?
तांदूळ किती रुपये आहे?
```

### Punjabi (ਪੰਜਾਬੀ)
```
ਟਮਾਟਰ ਦੀ ਕੀਮਤ ਕੀ ਹੈ?
ਆਲੂ ਦਾ ਭਾਅ ਦੱਸੋ
ਪਿਆਜ਼ ਦੀ ਕੀਮਤ ਕੀ ਹੈ?
ਕਣਕ ਦਾ ਭਾਅ ਕੀ ਹੈ?
ਚਾਵਲ ਦੀ ਕੀਮਤ ਦੱਸੋ
```

### Tamil (தமிழ்)
```
தக்காளி விலை என்ன?
உருளைக்கிழங்கு விலை சொல்லுங்கள்
வெங்காயம் விலை என்ன?
கோதுமை விலை சொல்லுங்கள்
அரிசி விலை என்ன?
```

## 🌤️ Weather Queries

### English
```
What is the weather today?
Tell me the weather forecast
How is the weather?
Will it rain today?
What's the temperature?
```

### Hindi (हिन्दी)
```
आज मौसम कैसा है?
मौसम का हाल बताओ
बारिश होगी क्या?
तापमान कितना है?
मौसम की जानकारी दो
```

### Marathi (मराठी)
```
आज हवामान कसे आहे?
पाऊस पडेल का?
तापमान किती आहे?
हवामान सांगा
हवामान अंदाज काय आहे?
```

## 🌾 Farming Advice Queries

### English
```
How do I grow wheat?
Tell me about rice farming
Potato cultivation tips
How to grow tomatoes?
Onion farming advice
Maize growing tips
Cotton cultivation guide
```

### Hindi (हिन्दी)
```
गेहूं कैसे उगाएं?
धान की खेती के बारे में बताओ
आलू की खेती कैसे करें?
टमाटर कैसे उगाएं?
प्याज की खेती की जानकारी
मक्का कैसे उगाएं?
कपास की खेती कैसे करें?
```

### Marathi (मराठी)
```
गहू कसा पिकवायचा?
भात लागवड कशी करायची?
बटाटा कसा पिकवायचा?
टोमॅटो कसे पिकवायचे?
कांदा लागवड कशी करायची?
मका कसा पिकवायचा?
कापूस लागवड कशी करायची?
```

## 📝 Other Queries

### Help
```
Help
मदद
मदत
ਮਦਦ
உதவி
```

### Create Listing (Intent Recognition Only)
```
I want to sell rice
मैं चावल बेचना चाहता हूं
मला भात विकायचा आहे
```

## 🎯 Expected Response Format (Crop Prices)

When you ask about crop prices, you'll see:

```
📊 TOMATO PRICE INFORMATION

🌾 FARM GATE PRICE (What farmers are selling at):
   Average: ₹35 per kg
   Range: ₹30 - ₹40 per kg

🏪 ESTIMATED RETAIL PRICE (Market price for consumers):
   Average: ₹49 per kg
   Range: ₹42 - ₹56 per kg

📈 Price Trend: STABLE
📍 Based on 3 active farmer listings

💡 Note: Retail prices include transportation, handling, and market fees.
```

**Key Features:**
- Shows BOTH farm gate and retail prices
- Farm gate = what farmers sell at
- Retail = market price (40% markup)
- Price trend (up/down/stable)
- Number of listings used

## 🎤 Voice Input Testing

**Important**: Voice input requires speaking in **English or Hindi** only (AWS Transcribe limitation)

### For Marathi Users:
1. **Option 1**: Use text input (type in Marathi)
2. **Option 2**: Speak in Hindi, get response in Marathi

### Steps:
1. Click microphone button (🎤)
2. Allow microphone permissions
3. Speak clearly: "What is the price of tomato?"
4. Wait for transcription
5. Message sends automatically

## 🔄 Quick Action Buttons

Click these buttons for instant queries:
- 🍅 **Tomato Price** - Tests crop price handler
- 🌤️ **Weather** - Tests weather handler  
- 🌾 **Farming Tips** - Tests farming advice handler
- 📝 **Create Listing** - Tests intent recognition
- ❓ **Help** - Tests help intent

## 📊 Available Crops (32 Tips)

Test farming advice for these crops:
1. **Wheat** (गेहूं / गहू)
2. **Rice** (चावल / भात)
3. **Tomato** (टमाटर / टोमॅटो)
4. **Potato** (आलू / बटाटा)
5. **Onion** (प्याज / कांदा)
6. **Maize** (मक्का / मका)
7. **Cotton** (कपास / कापूस)

## 🌍 Supported Languages (11)

1. English
2. Hindi (हिन्दी)
3. Punjabi (ਪੰਜਾਬੀ)
4. Marathi (मराठी)
5. Tamil (தமிழ்)
6. Telugu (తెలుగు)
7. Bengali (বাংলা)
8. Gujarati (ગુજરાતી)
9. Kannada (ಕನ್ನಡ)
10. Malayalam (മലയാളം)
11. Odia (ଓଡ଼ିଆ)

## 💡 Pro Tips

1. **Test in multiple languages** - Switch language dropdown and try same query
2. **Watch the stats panel** - See messages, intents, and confidence scores
3. **Try voice input** - Click microphone and speak (English/Hindi only)
4. **Use quick actions** - Fastest way to test different features
5. **Check response format** - Notice farm gate vs retail prices distinction

## 🐛 Known Issues

1. **Mock Mode**: Using simulated data (this is normal for testing)
2. **Marathi Voice**: Not supported by AWS Transcribe (use text input)
3. **Crop Prices**: Mock data in Mock mode (need real marketplace data for Live mode)
4. **Weather**: Mock data in Mock mode (need OpenWeatherMap API key for Live mode)

## 📝 Feedback Checklist

While testing, check:
- [ ] Response accuracy
- [ ] Translation quality
- [ ] Farm gate vs retail price clarity
- [ ] UI/UX experience
- [ ] Voice input (English/Hindi)
- [ ] Quick actions work
- [ ] Stats update correctly
- [ ] Multi-language support
- [ ] Response formatting
- [ ] Any bugs or issues

---

**Happy Testing! 🎉**

**URL**: http://localhost:3000/kisan-mitra-test.html
**Mode**: Mock (no AWS Lex required)
**Phase**: 1 Complete (Database Integrations)
