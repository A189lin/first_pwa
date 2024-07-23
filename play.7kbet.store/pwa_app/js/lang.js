 let languages = [
     "ar",
     "bn",
     "de",
     "en-Us",
     "es",
     "hi",
     "id",
     "ja",
     "ko",
     "ms-MY",
     "pt-BR",
     "ru",
     "ta-IN",
     "te-IN",
     "th",
     "tr",
     "vi",
     "zh-CN"
 ]

 function includeLang(userLanguage) {
     if (languages.includes(userLanguage)) {
         return true;
     } else {
         return false;
     }
 }