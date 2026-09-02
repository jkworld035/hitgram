import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageBase64, mealType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const prompt = `You are an expert nutritionist and food recognition AI. Analyze this food image and identify all visible food items.

For each food item detected, provide accurate nutritional estimates based on the visible portion size.

Return ONLY valid JSON in this exact format, no other text:
{
  "detected": true,
  "confidence": "high|medium|low",
  "meal_name": "descriptive name of the overall meal",
  "foods": [
    {
      "name": "food item name",
      "portion": "estimated portion e.g. 1 cup, 150g, 2 pieces",
      "calories": 250,
      "protein_g": 15.5,
      "carbs_g": 30.2,
      "fat_g": 8.1,
      "fiber_g": 3.2,
      "confidence": "high|medium|low",
      "notes": "any relevant note about this item"
    }
  ],
  "totals": {
    "calories": 450,
    "protein_g": 28.5,
    "carbs_g": 55.3,
    "fat_g": 12.4,
    "fiber_g": 6.8
  },
  "meal_type": "${mealType || 'meal'}",
  "health_score": 75,
  "ai_suggestion": "brief 1-2 sentence health tip about this meal",
  "disclaimer": "Nutritional values are AI estimates based on visual analysis. Actual values may vary by 15-25%."
}`

    // Try Anthropic Claude Vision
    if (process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-opus-5',
            max_tokens: 1500,
            messages: [{
              role:    'user',
              content: [
                {
                  type:   'image',
                  source: {
                    type:       'base64',
                    media_type: imageBase64.startsWith('/9j/') ? 'image/jpeg' : 'image/png',
                    data:       imageBase64,
                  },
                },
                { type: 'text', text: prompt },
              ],
            }],
          }),
        })

        if (response.ok) {
          const data  = await response.json()
          const text  = data.content?.[0]?.text || ''
          const start = text.indexOf('{')
          const end   = text.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            const parsed = JSON.parse(text.slice(start, end + 1))
            return NextResponse.json({ success: true, result: parsed })
          }
        }
      } catch (err) {
        console.error('Claude vision error:', err)
      }
    }

    // Fallback — return demo data when no API key
    return NextResponse.json({
      success: true,
      result: {
        detected:    true,
        confidence:  'medium',
        meal_name:   'Mixed Meal (Demo Mode)',
        foods: [
          { name:'Rice',            portion:'1 cup (185g)',  calories:240, protein_g:5,  carbs_g:52, fat_g:0.5, fiber_g:1, confidence:'medium', notes:'Estimated from visual size' },
          { name:'Chicken Curry',   portion:'150g',          calories:220, protein_g:28, carbs_g:8,  fat_g:9,   fiber_g:2, confidence:'medium', notes:'Estimated protein content' },
          { name:'Mixed Vegetables',portion:'½ cup',         calories:45,  protein_g:2,  carbs_g:8,  fat_g:0.5, fiber_g:3, confidence:'high',   notes:'Low calorie side' },
        ],
        totals: { calories:505, protein_g:35, carbs_g:68, fat_g:10, fiber_g:6 },
        meal_type:       mealType || 'lunch',
        health_score:    72,
        ai_suggestion:   'Good protein content! Consider adding a salad for more fiber and micronutrients.',
        disclaimer:      'Demo mode: Add Anthropic API key with vision access for real food analysis. Values shown are examples only.',
      },
      demo: !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-'),
    })

  } catch (error) {
    console.error('Food scan error:', error)
    return NextResponse.json({ error: 'Food scan failed' }, { status: 500 })
  }
}