// services/geminiService.ts

// המפתח החדש והתקין שלך (מפרויקט baby-app)
const API_KEY = "AIzaSyAMFjW-rZxkepphE1CDwZBmM5TY3GKLkaE"; 

export const getAIPrediction = async (activities: any[]) => {
  try {
    // 1. בדיקה שיש מספיק נתונים
    if (!activities || activities.length < 3) {
      return { tip: "כדי שאוכל לתת תובנות, תעדו לפחות 3 פעולות (אוכל/שינה) :)" };
    }

    // 2. הכנת ההיסטוריה לטקסט
    const historyText = activities.map(a => 
      `- ${a.type} at ${new Date(a.timestamp).toLocaleString('he-IL')}`
    ).join('\n');

    const prompt = `
      Analyze this baby log:
      ${historyText}
      Give ONE short tip in Hebrew about the next sleep or feed.
      Keep it under 20 words.
    `;

    // 3. ניסיון ראשון: מודל flash (המהיר והמומלץ)
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    // 4. מנגנון גיבוי: אם flash נכשל, ננסה מיד את pro
    if (!response.ok) {
      console.log("Flash model failed, switching to Pro backup...");
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
    }

    const data = await response.json();

    // 5. בדיקה סופית
    if (!response.ok) {
      console.error("Final API Error:", data);
      return { tip: "ה-AI מתעדכן כרגע... נסו שוב עוד דקה." };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { tip: text ? text.trim() : "לא הצלחתי לייצר תובנה." };

  } catch (error) {
    console.error("Network Error:", error);
    return { tip: "שגיאת תקשורת. בדקו את החיבור." };
  }
};