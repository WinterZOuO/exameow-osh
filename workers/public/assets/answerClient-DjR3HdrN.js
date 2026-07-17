async function e(e,n,r,i){let a=r.endpoint.replace(/\/+$/,``),o=await fetch(`${a}/chat/completions`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${r.api_key}`},body:JSON.stringify({model:r.model,messages:[{role:`system`,content:`You are an expert exam-solving assistant. The user will give you an exam question (it may include options). Solve it.

## Output Rules
1. Respond ONLY with a valid JSON object — no explanation outside JSON, no markdown fences.
2. The JSON object MUST have exactly these fields:
   - "answer": the concise answer. For choice questions give the option letter(s) plus the option content; for true/false questions answer "True" or "False" (or the equivalent in the requested language); otherwise give the answer text directly.
   - "analysis": a clear step-by-step explanation of why this answer is correct.
3. Use the requested language for both fields.
4. If the question is ambiguous or unanswerable, still fill "answer" with your best attempt and explain the uncertainty in "analysis".`},{role:`user`,content:`Language: ${n}\n\nQUESTION:\n${e}`}],temperature:.7,max_tokens:16384}),signal:i});if(!o.ok)throw Error(`HTTP ${o.status}: ${await o.text().catch(()=>``)}`);let s=(await o.json()).choices?.[0]?.message?.content;if(typeof s!=`string`)throw Error(`AI returned no content`);return t(s)}function t(e){let t=e.trim();t=t.replace(/^```(?:json)?\s*\n?/i,``),t=t.replace(/\n?```\s*$/i,``);let n=t.indexOf(`{`),r=t.lastIndexOf(`}`),i=n>=0&&r>=n?t.slice(n,r+1):t,a=JSON.parse(i);if(typeof a?.answer!=`string`||typeof a?.analysis!=`string`)throw Error(`AI answer missing "answer"/"analysis" fields`);return{answer:a.answer,analysis:a.analysis}}function n(e,t){let n=e.analysis??``,r=n.trim()?`\n\nREFERENCE ANALYSIS:\n${n}`:``;return`Language: ${t}\n\nQUESTION:\n${e.stem}\n\nREFERENCE ANSWER:\n${e.reference_answer}${r}\n\nSTUDENT ANSWER:\n${e.user_answer}`}async function r(e,t,r,a){let o=r.endpoint.replace(/\/+$/,``),s=await fetch(`${o}/chat/completions`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${r.api_key}`},body:JSON.stringify({model:r.model,messages:[{role:`system`,content:`You are a strict but fair exam grader. You will be given an exam question, the reference answer, an optional reference analysis, and a student's answer. Decide whether the student's answer is correct.

## Grading Rules
1. Judge by meaning, not wording: if the student's answer is semantically equivalent to the reference answer, it is correct even if phrased differently.
2. A partial answer that misses key points required by the reference answer is incorrect.
3. Extra correct information does not make the answer wrong, unless it contradicts the reference answer.

## Output Rules
1. Respond ONLY with a valid JSON object — no explanation outside JSON, no markdown fences.
2. The JSON object MUST have exactly these fields:
   - "correct": true or false
   - "feedback": one or two sentences explaining why the answer is correct, or what is missing or wrong.
3. Write "feedback" in the requested language.`},{role:`user`,content:n(e,t)}],temperature:.7,max_tokens:16384}),signal:a});if(!s.ok)throw Error(`HTTP ${s.status}: ${await s.text().catch(()=>``)}`);let c=(await s.json()).choices?.[0]?.message?.content;if(typeof c!=`string`)throw Error(`AI returned no content`);return i(c)}function i(e){let t=e.trim();t=t.replace(/^```(?:json)?\s*\n?/i,``),t=t.replace(/\n?```\s*$/i,``);let n=t.indexOf(`{`),r=t.lastIndexOf(`}`),i=n>=0&&r>=n?t.slice(n,r+1):t,a=JSON.parse(i);if(typeof a?.correct!=`boolean`||typeof a?.feedback!=`string`)throw Error(`AI judge missing "correct"/"feedback" fields`);return{correct:a.correct,feedback:a.feedback}}export{e as answerViaCustomAI,r as judgeViaCustomAI};