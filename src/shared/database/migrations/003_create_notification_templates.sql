-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  language VARCHAR(10) NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, language)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_lang ON notification_templates(type, language);

-- Seed notification templates in English
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'en', 'Your listing for {{produceType}} has been created successfully. Quantity: {{quantity}} kg at ₹{{pricePerKg}}/kg.'),
  ('listing_sold', 'en', 'Great news! Your listing for {{produceType}} has been sold to {{buyerName}}.'),
  ('order_confirmed', 'en', 'Your order for {{quantity}} kg of {{produceType}} has been confirmed. Total: ₹{{totalAmount}}.'),
  ('payment_received', 'en', 'Payment of ₹{{amount}} has been received for your order #{{orderId}}.'),
  ('payment_released', 'en', 'Payment of ₹{{amount}} has been released to your account for order #{{orderId}}.'),
  ('delivery_scheduled', 'en', 'Delivery scheduled for {{deliveryDate}} at {{deliveryTime}}.'),
  ('delivery_completed', 'en', 'Delivery completed successfully for order #{{orderId}}.'),
  ('price_updated', 'en', 'Price for {{produceType}} has been updated to ₹{{newPrice}}/kg.'),
  ('new_message', 'en', 'You have a new message from {{senderName}}: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Hindi
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'hi', 'आपकी {{produceType}} की लिस्टिंग सफलतापूर्वक बनाई गई है। मात्रा: {{quantity}} किलो ₹{{pricePerKg}}/किलो पर।'),
  ('listing_sold', 'hi', 'बढ़िया खबर! आपकी {{produceType}} की लिस्टिंग {{buyerName}} को बेची गई है।'),
  ('order_confirmed', 'hi', '{{produceType}} के {{quantity}} किलो के आपके ऑर्डर की पुष्टि हो गई है। कुल: ₹{{totalAmount}}।'),
  ('payment_received', 'hi', 'आपके ऑर्डर #{{orderId}} के लिए ₹{{amount}} का भुगतान प्राप्त हुआ है।'),
  ('payment_released', 'hi', 'ऑर्डर #{{orderId}} के लिए ₹{{amount}} का भुगतान आपके खाते में जारी किया गया है।'),
  ('delivery_scheduled', 'hi', '{{deliveryDate}} को {{deliveryTime}} बजे डिलीवरी निर्धारित है।'),
  ('delivery_completed', 'hi', 'ऑर्डर #{{orderId}} के लिए डिलीवरी सफलतापूर्वक पूर्ण हुई।'),
  ('price_updated', 'hi', '{{produceType}} की कीमत ₹{{newPrice}}/किलो में अपडेट की गई है।'),
  ('new_message', 'hi', 'आपको {{senderName}} से एक नया संदेश है: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Punjabi
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'pa', 'ਤੁਹਾਡੀ {{produceType}} ਦੀ ਲਿਸਟਿੰਗ ਸਫਲਤਾਪੂਰਵਕ ਬਣਾਈ ਗਈ ਹੈ। ਮਾਤਰਾ: {{quantity}} ਕਿਲੋ ₹{{pricePerKg}}/ਕਿਲੋ ਤੇ।'),
  ('listing_sold', 'pa', 'ਵਧੀਆ ਖਬਰ! ਤੁਹਾਡੀ {{produceType}} ਦੀ ਲਿਸਟਿੰਗ {{buyerName}} ਨੂੰ ਵੇਚੀ ਗਈ ਹੈ।'),
  ('order_confirmed', 'pa', '{{produceType}} ਦੇ {{quantity}} ਕਿਲੋ ਦੇ ਤੁਹਾਡੇ ਆਰਡਰ ਦੀ ਪੁਸ਼ਟੀ ਹੋ ਗਈ ਹੈ। ਕੁੱਲ: ₹{{totalAmount}}।'),
  ('payment_received', 'pa', 'ਤੁਹਾਡੇ ਆਰਡਰ #{{orderId}} ਲਈ ₹{{amount}} ਦਾ ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ ਹੈ।'),
  ('payment_released', 'pa', 'ਆਰਡਰ #{{orderId}} ਲਈ ₹{{amount}} ਦਾ ਭੁਗਤਾਨ ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਜਾਰੀ ਕੀਤਾ ਗਿਆ ਹੈ।'),
  ('delivery_scheduled', 'pa', '{{deliveryDate}} ਨੂੰ {{deliveryTime}} ਵਜੇ ਡਿਲੀਵਰੀ ਨਿਰਧਾਰਤ ਹੈ।'),
  ('delivery_completed', 'pa', 'ਆਰਡਰ #{{orderId}} ਲਈ ਡਿਲੀਵਰੀ ਸਫਲਤਾਪੂਰਵਕ ਪੂਰੀ ਹੋਈ।'),
  ('price_updated', 'pa', '{{produceType}} ਦੀ ਕੀਮਤ ₹{{newPrice}}/ਕਿਲੋ ਵਿੱਚ ਅੱਪਡੇਟ ਕੀਤੀ ਗਈ ਹੈ।'),
  ('new_message', 'pa', 'ਤੁਹਾਨੂੰ {{senderName}} ਤੋਂ ਇੱਕ ਨਵਾਂ ਸੁਨੇਹਾ ਹੈ: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Marathi
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'mr', 'तुमची {{produceType}} ची लिस्टिंग यशस्वीरित्या तयार केली गेली आहे। प्रमाण: {{quantity}} किलो ₹{{pricePerKg}}/किलो वर।'),
  ('listing_sold', 'mr', 'छान बातमी! तुमची {{produceType}} ची लिस्टिंग {{buyerName}} ला विकली गेली आहे।'),
  ('order_confirmed', 'mr', '{{produceType}} च्या {{quantity}} किलोच्या तुमच्या ऑर्डरची पुष्टी झाली आहे। एकूण: ₹{{totalAmount}}।'),
  ('payment_received', 'mr', 'तुमच्या ऑर्डर #{{orderId}} साठी ₹{{amount}} चे पेमेंट मिळाले आहे।'),
  ('payment_released', 'mr', 'ऑर्डर #{{orderId}} साठी ₹{{amount}} चे पेमेंट तुमच्या खात्यात सोडले गेले आहे।'),
  ('delivery_scheduled', 'mr', '{{deliveryDate}} रोजी {{deliveryTime}} वाजता डिलिव्हरी शेड्यूल केली आहे।'),
  ('delivery_completed', 'mr', 'ऑर्डर #{{orderId}} साठी डिलिव्हरी यशस्वीरित्या पूर्ण झाली।'),
  ('price_updated', 'mr', '{{produceType}} ची किंमत ₹{{newPrice}}/किलो मध्ये अपडेट केली गेली आहे।'),
  ('new_message', 'mr', 'तुम्हाला {{senderName}} कडून एक नवीन संदेश आहे: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Tamil
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'ta', 'உங்கள் {{produceType}} பட்டியல் வெற்றிகரமாக உருவாக்கப்பட்டது. அளவு: {{quantity}} கிலோ ₹{{pricePerKg}}/கிலோ விலையில்।'),
  ('listing_sold', 'ta', 'நல்ல செய்தி! உங்கள் {{produceType}} பட்டியல் {{buyerName}} க்கு விற்கப்பட்டது।'),
  ('order_confirmed', 'ta', '{{produceType}} இன் {{quantity}} கிலோவுக்கான உங்கள் ஆர்டர் உறுதிப்படுத்தப்பட்டது. மொத்தம்: ₹{{totalAmount}}।'),
  ('payment_received', 'ta', 'உங்கள் ஆர்டர் #{{orderId}} க்கு ₹{{amount}} பணம் பெறப்பட்டது।'),
  ('payment_released', 'ta', 'ஆர்டர் #{{orderId}} க்கு ₹{{amount}} பணம் உங்கள் கணக்கில் வெளியிடப்பட்டது।'),
  ('delivery_scheduled', 'ta', '{{deliveryDate}} அன்று {{deliveryTime}} க்கு டெலிவரி திட்டமிடப்பட்டுள்ளது।'),
  ('delivery_completed', 'ta', 'ஆர்டர் #{{orderId}} க்கான டெலிவரி வெற்றிகரமாக முடிந்தது।'),
  ('price_updated', 'ta', '{{produceType}} விலை ₹{{newPrice}}/கிலோ என புதுப்பிக்கப்பட்டது।'),
  ('new_message', 'ta', 'உங்களுக்கு {{senderName}} இடமிருந்து புதிய செய்தி: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Telugu
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'te', 'మీ {{produceType}} జాబితా విజయవంతంగా సృష్టించబడింది. పరిమాణం: {{quantity}} కిలోలు ₹{{pricePerKg}}/కిలో ధరకు।'),
  ('listing_sold', 'te', 'మంచి వార్త! మీ {{produceType}} జాబితా {{buyerName}} కు అమ్ముడైంది।'),
  ('order_confirmed', 'te', '{{produceType}} యొక్క {{quantity}} కిలోల మీ ఆర్డర్ నిర్ధారించబడింది। మొత్తం: ₹{{totalAmount}}।'),
  ('payment_received', 'te', 'మీ ఆర్డర్ #{{orderId}} కోసం ₹{{amount}} చెల్లింపు అందింది।'),
  ('payment_released', 'te', 'ఆర్డర్ #{{orderId}} కోసం ₹{{amount}} చెల్లింపు మీ ఖాతాకు విడుదల చేయబడింది।'),
  ('delivery_scheduled', 'te', '{{deliveryDate}} న {{deliveryTime}} కు డెలివరీ షెడ్యూల్ చేయబడింది।'),
  ('delivery_completed', 'te', 'ఆర్డర్ #{{orderId}} కోసం డెలివరీ విజయవంతంగా పూర్తయింది।'),
  ('price_updated', 'te', '{{produceType}} ధర ₹{{newPrice}}/కిలో గా నవీకరించబడింది।'),
  ('new_message', 'te', 'మీకు {{senderName}} నుండి కొత్త సందేశం: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Bengali
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'bn', 'আপনার {{produceType}} তালিকা সফলভাবে তৈরি হয়েছে। পরিমাণ: {{quantity}} কেজি ₹{{pricePerKg}}/কেজি দামে।'),
  ('listing_sold', 'bn', 'ভালো খবর! আপনার {{produceType}} তালিকা {{buyerName}} কে বিক্রি হয়েছে।'),
  ('order_confirmed', 'bn', '{{produceType}} এর {{quantity}} কেজির আপনার অর্ডার নিশ্চিত হয়েছে। মোট: ₹{{totalAmount}}।'),
  ('payment_received', 'bn', 'আপনার অর্ডার #{{orderId}} এর জন্য ₹{{amount}} পেমেন্ট পাওয়া গেছে।'),
  ('payment_released', 'bn', 'অর্ডার #{{orderId}} এর জন্য ₹{{amount}} পেমেন্ট আপনার অ্যাকাউন্টে মুক্তি দেওয়া হয়েছে।'),
  ('delivery_scheduled', 'bn', '{{deliveryDate}} তারিখে {{deliveryTime}} সময়ে ডেলিভারি নির্ধারিত।'),
  ('delivery_completed', 'bn', 'অর্ডার #{{orderId}} এর জন্য ডেলিভারি সফলভাবে সম্পন্ন হয়েছে।'),
  ('price_updated', 'bn', '{{produceType}} এর দাম ₹{{newPrice}}/কেজি তে আপডেট করা হয়েছে।'),
  ('new_message', 'bn', 'আপনার {{senderName}} থেকে একটি নতুন বার্তা আছে: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Gujarati
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'gu', 'તમારી {{produceType}} ની લિસ્ટિંગ સફળતાપૂર્વક બનાવવામાં આવી છે। જથ્થો: {{quantity}} કિલો ₹{{pricePerKg}}/કિલો ભાવે।'),
  ('listing_sold', 'gu', 'સારા સમાચાર! તમારી {{produceType}} ની લિસ્ટિંગ {{buyerName}} ને વેચાઈ છે।'),
  ('order_confirmed', 'gu', '{{produceType}} ના {{quantity}} કિલોના તમારા ઓર્ડરની પુષ્ટિ થઈ છે। કુલ: ₹{{totalAmount}}।'),
  ('payment_received', 'gu', 'તમારા ઓર્ડર #{{orderId}} માટે ₹{{amount}} ની ચુકવણી પ્રાપ્ત થઈ છે।'),
  ('payment_released', 'gu', 'ઓર્ડર #{{orderId}} માટે ₹{{amount}} ની ચુકવણી તમારા ખાતામાં મુક્ત કરવામાં આવી છે।'),
  ('delivery_scheduled', 'gu', '{{deliveryDate}} ના રોજ {{deliveryTime}} વાગ્યે ડિલિવરી શેડ્યૂલ કરવામાં આવી છે।'),
  ('delivery_completed', 'gu', 'ઓર્ડર #{{orderId}} માટે ડિલિવરી સફળતાપૂર્વક પૂર્ણ થઈ છે।'),
  ('price_updated', 'gu', '{{produceType}} ની કિંમત ₹{{newPrice}}/કિલો માં અપડેટ કરવામાં આવી છે।'),
  ('new_message', 'gu', 'તમને {{senderName}} તરફથી નવો સંદેશ છે: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Kannada
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'kn', 'ನಿಮ್ಮ {{produceType}} ಪಟ್ಟಿ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ। ಪ್ರಮಾಣ: {{quantity}} ಕೆಜಿ ₹{{pricePerKg}}/ಕೆಜಿ ದರದಲ್ಲಿ।'),
  ('listing_sold', 'kn', 'ಒಳ್ಳೆಯ ಸುದ್ದಿ! ನಿಮ್ಮ {{produceType}} ಪಟ್ಟಿ {{buyerName}} ಗೆ ಮಾರಾಟವಾಗಿದೆ।'),
  ('order_confirmed', 'kn', '{{produceType}} ನ {{quantity}} ಕೆಜಿ ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ। ಒಟ್ಟು: ₹{{totalAmount}}।'),
  ('payment_received', 'kn', 'ನಿಮ್ಮ ಆರ್ಡರ್ #{{orderId}} ಗಾಗಿ ₹{{amount}} ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ।'),
  ('payment_released', 'kn', 'ಆರ್ಡರ್ #{{orderId}} ಗಾಗಿ ₹{{amount}} ಪಾವತಿ ನಿಮ್ಮ ಖಾತೆಗೆ ಬಿಡುಗಡೆ ಮಾಡಲಾಗಿದೆ।'),
  ('delivery_scheduled', 'kn', '{{deliveryDate}} ರಂದು {{deliveryTime}} ಕ್ಕೆ ವಿತರಣೆ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ।'),
  ('delivery_completed', 'kn', 'ಆರ್ಡರ್ #{{orderId}} ಗಾಗಿ ವಿತರಣೆ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ।'),
  ('price_updated', 'kn', '{{produceType}} ಬೆಲೆ ₹{{newPrice}}/ಕೆಜಿ ಗೆ ನವೀಕರಿಸಲಾಗಿದೆ।'),
  ('new_message', 'kn', 'ನಿಮಗೆ {{senderName}} ನಿಂದ ಹೊಸ ಸಂದೇಶ: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Malayalam
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'ml', 'നിങ്ങളുടെ {{produceType}} ലിസ്റ്റിംഗ് വിജയകരമായി സൃഷ്ടിച്ചു। അളവ്: {{quantity}} കിലോ ₹{{pricePerKg}}/കിലോ നിരക്കിൽ।'),
  ('listing_sold', 'ml', 'നല്ല വാർത്ത! നിങ്ങളുടെ {{produceType}} ലിസ്റ്റിംഗ് {{buyerName}} ന് വിറ്റു।'),
  ('order_confirmed', 'ml', '{{produceType}} ന്റെ {{quantity}} കിലോയുടെ നിങ്ങളുടെ ഓർഡർ സ്ഥിരീകരിച്ചു। ആകെ: ₹{{totalAmount}}।'),
  ('payment_received', 'ml', 'നിങ്ങളുടെ ഓർഡർ #{{orderId}} ന് ₹{{amount}} പേയ്മെന്റ് ലഭിച്ചു।'),
  ('payment_released', 'ml', 'ഓർഡർ #{{orderId}} ന് ₹{{amount}} പേയ്മെന്റ് നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് റിലീസ് ചെയ്തു।'),
  ('delivery_scheduled', 'ml', '{{deliveryDate}} ന് {{deliveryTime}} ന് ഡെലിവറി ഷെഡ്യൂൾ ചെയ്തു।'),
  ('delivery_completed', 'ml', 'ഓർഡർ #{{orderId}} ന്റെ ഡെലിവറി വിജയകരമായി പൂർത്തിയായി।'),
  ('price_updated', 'ml', '{{produceType}} വില ₹{{newPrice}}/കിലോ ആയി അപ്ഡേറ്റ് ചെയ്തു।'),
  ('new_message', 'ml', 'നിങ്ങൾക്ക് {{senderName}} ൽ നിന്ന് പുതിയ സന്ദേശം: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;

-- Seed notification templates in Odia
INSERT INTO notification_templates (type, language, template) VALUES
  ('listing_created', 'or', 'ଆପଣଙ୍କର {{produceType}} ତାଲିକା ସଫଳତାର ସହିତ ସୃଷ୍ଟି ହୋଇଛି। ପରିମାଣ: {{quantity}} କିଲୋ ₹{{pricePerKg}}/କିଲୋ ମୂଲ୍ୟରେ।'),
  ('listing_sold', 'or', 'ଭଲ ଖବର! ଆପଣଙ୍କର {{produceType}} ତାଲିକା {{buyerName}} କୁ ବିକ୍ରି ହୋଇଛି।'),
  ('order_confirmed', 'or', '{{produceType}} ର {{quantity}} କିଲୋର ଆପଣଙ୍କ ଅର୍ଡର ନିଶ୍ଚିତ ହୋଇଛି। ମୋଟ: ₹{{totalAmount}}।'),
  ('payment_received', 'or', 'ଆପଣଙ୍କ ଅର୍ଡର #{{orderId}} ପାଇଁ ₹{{amount}} ପେମେଣ୍ଟ ପାଇଛି।'),
  ('payment_released', 'or', 'ଅର୍ଡର #{{orderId}} ପାଇଁ ₹{{amount}} ପେମେଣ୍ଟ ଆପଣଙ୍କ ଖାତାକୁ ମୁକ୍ତ କରାଯାଇଛି।'),
  ('delivery_scheduled', 'or', '{{deliveryDate}} ରେ {{deliveryTime}} ରେ ଡେଲିଭରୀ ନିର୍ଧାରିତ।'),
  ('delivery_completed', 'or', 'ଅର୍ଡର #{{orderId}} ପାଇଁ ଡେଲିଭରୀ ସଫଳତାର ସହିତ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି।'),
  ('price_updated', 'or', '{{produceType}} ମୂଲ୍ୟ ₹{{newPrice}}/କିଲୋ ରେ ଅପଡେଟ୍ ହୋଇଛି।'),
  ('new_message', 'or', 'ଆପଣଙ୍କୁ {{senderName}} ଠାରୁ ଏକ ନୂତନ ସନ୍ଦେଶ ଅଛି: {{messagePreview}}')
ON CONFLICT (type, language) DO NOTHING;
