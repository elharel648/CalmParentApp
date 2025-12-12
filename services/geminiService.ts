// services/geminiService.ts

// המפתח החדש והתקין שלך (מתוך API key 2)
const API_KEY = "AIzaSyAMFjW-rZxkepphE1CDwZBmM5TY3GKLkaE"; 

export const getAIPrediction = async (activities: any[]) => {
  try {
    // 1. בדיקה שיש מספיק נתונים
    if (!activities || activities.length < 3) {
      return {
        tip: "כדי שאוכל לתת תובנות חכמות, תעדו לפחות 3 פעולות (אוכל/שינה) :)",
      };
    }

    // 2. הכנת הטקסט ל-AI
    const historyText = activities.map(a => 
      `- ${a.type} at ${new Date(a.timestamp).toLocaleString('he-IL')}`
    ).join('\n');

    const prompt = `
      You are a smart baby tracking assistant.
      Here is the recent log of the baby's activities:
      ${historyText}

      Based heavily on this pattern, analyze the baby's schedule.
      Task: Provide ONE short, helpful insight or tip for the parent in Hebrew.
      
      Examples of good insights:
      - "נראה שהתינוק רעב כל 3 שעות, הארוחה הבאה צפויה סביב 14:00."
      - "התינוק ישן טוב יותר אחרי ארוחות גדולות."
      - "שימו לב: התינוק ער כבר שעתיים, כדאי להשכיב לישון בקרוב."

      Return ONLY the Hebrew text. No JSON, no formatting. Keep it under 20 words.
    `;

    // 3. שליחה למודל 1.5-flash (המהיר והמומלץ)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    const data = await response.json();

    // 4. מנגנון גיבוי: אם flash נכשל, ננסה את pro
    if (!response.ok) {
      console.log("Flash model failed, trying Pro model...");
      const responsePro = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const dataPro = await responsePro.json();
      
      if (!responsePro.ok) {
         console.error("API Error:", dataPro);
         return { tip: "ה-AI מתעדכן... נסו שוב עוד דקה." };
      }
      
      const textPro = dataPro.candidates?.[0]?.content?.parts?.[0]?.text;
      return { tip: textPro ? textPro.trim() : "לא הצלחתי לייצר תובנה." };
    }

    // 5. הצלחה עם המודל הראשון
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { tip: text ? text.trim() : "לא הצלחתי לייצר תובנה." };

  } catch (error) {
    console.error("Network Error:", error);
    return {
      tip: "בעיית תקשורת. בדקו את האינטרנט שלכם.",
    };
  }
};