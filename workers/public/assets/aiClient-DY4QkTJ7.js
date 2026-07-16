function e(){return`You are an expert exam question generator. Generate questions based on the provided document content.

## Critical Rules (MUST follow)
- EVERY question MUST be unique — do NOT generate two questions that test the same concept, fact, or sentence.
- Cover DIFFERENT parts of the document for each question. Avoid clustering questions on the same paragraph.
- Vary question wording, angles, and tested knowledge points.
- When the question stem or analysis refers to the document, ALWAYS use the specific document name provided — NEVER use vague phrases like "the document", "the text", "the passage", "the article", or "the material".

## Output Rules
1. Respond ONLY with a valid JSON array — no explanation, no markdown fences.
2. Each question object MUST have exactly these fields:
   - "id": a short unique identifier string
   - "type": one of [${[`single_choice`,`multi_choice`,`true_false`,`fill_blank`,`short_answer`].join(`, `)}]
   - "stem": the question text
   - "options": array of option strings (required for single_choice/multi_choice/true_false; empty array for others)
   - "answer": the correct answer
   - "analysis": brief explanation of the answer (can be empty string for fill_blank/short_answer)
3. For single_choice: exactly 4 options, one correct.
4. For multi_choice: exactly 4 options, at least one correct (list correct letters separated by comma in answer).
5. For true_false: options ["True", "False"], answer is "True" or "False".
6. For fill_blank: answer is the exact word/phrase to fill in.
7. For short_answer: answer is a concise reference answer.
8. All questions must be based on the document content.
9. Use the specified language for questions.`}function t(e,t){let n={easy:`easy questions suitable for beginners`,medium:`moderate difficulty questions requiring understanding`,hard:`challenging questions requiring deep analysis`},r=n[t.difficulty]||n.medium,i=t.topic_filter?`\nFocus on this topic: ${t.topic_filter}`:``,a=t.batch_index!==void 0&&t.batch_total&&t.batch_total>1?`\nThis is batch ${t.batch_index}/${t.batch_total} of the document. Focus on different content than other batches would.`:``,o=t.source_name?t.source_name.includes(`、`)?`\nThe documents are collectively titled: ${t.source_name}\nWhen questions need to reference a specific document, use its individual title above — do NOT say "the document" or "the text".`:`\nThe document title is: ${t.source_name}\nWhen questions need to reference this document, use "${t.source_name}" — do NOT say "the document" or "the text".`:``,s=32e3,c=e.length>s?e.slice(0,s*6/10)+`

...(middle omitted)...

`+e.slice(e.length-s*4/10):e;return`${t.type_counts?(()=>{let e=[],n=0;for(let[r,i]of Object.entries(t.type_counts))i>0&&(e.push(`${i} ${r} questions`),n+=i);return`Generate exactly the following breakdown of ${n} questions:\n${e.join(`
`)}`})():`Generate ${t.count} questions.\nQuestion types: ${t.question_types.join(`, `)}`}
Difficulty: ${r}
Language: ${t.language}${i}${a}${o}

DOCUMENT CONTENT:
${c}`}function n(e){let t=e.trim();t=t.replace(/^```(?:json)?\s*\n?/i,``),t=t.replace(/\n?```\s*$/i,``);let n=t.search(/[\[\{]/);n>0&&(t=t.substring(n)),t=t.trim();let r=JSON.parse(t),i;if(Array.isArray(r))i=r;else if(r&&typeof r==`object`&&Array.isArray(r.questions))i=r.questions;else throw Error(`AI response is neither an array nor { questions: [...] }`);if(!i.length)throw Error(`AI returned empty questions array`);return i}async function r(r,i,a,o){let s=`${a.endpoint.replace(/\/+$/,``)}/chat/completions`,c={model:a.model,messages:[{role:`system`,content:e()},{role:`user`,content:t(r,i)}],temperature:.7,max_tokens:16384},l=await fetch(s,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${a.api_key}`},body:JSON.stringify(c),signal:o});if(!l.ok){let e=await l.text().catch(()=>``);throw Error(`AI API error ${l.status}: ${e}`)}let u=(await l.json()).choices?.[0]?.message?.content;if(!u)throw Error(`AI returned empty response`);return n(u)}export{r as callCustomAI};