// ═══════════════════════════════════════════
//  ONVO OS — تكامل الذكاء الاصطناعي (Claude via Netlify)
// ═══════════════════════════════════════════

const ONVO_AI = {
  endpoint: '/.netlify/functions/ai-proxy',
  model: 'claude-sonnet-4-20250514',

  systemPrompt: `أنت ONVO AI، المساعد الذكي لمنصة ONVO OS — منصة إدارة الفرق والإنتاجية المتكاملة. تساعد المؤسسين والقادة وأعضاء الفريق في:
- تخطيط المهام وتحديد الأولويات
- تحليل أداء الفريق وتقديم رؤى قيّمة
- نصائح إدارة العملاء
- استراتيجيات التسويق والحملات الإعلانية
- نصائح الإنتاجية والتخطيط الأسبوعي
- الدعم التحفيزي للفريق

تجيب بالعربية دائماً. اجعل إجاباتك موجزة ومهنية وقابلة للتطبيق. استخدم النقاط عند الحاجة. لا تتجاوز ٣-٤ جمل إلا إذا طُلب منك تفصيل أكثر.`,

  conversationHistory: [],

  async chat(userMessage, onChunk) {
    this.conversationHistory.push({ role: 'user', content: userMessage });
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 500,
          system: this.systemPrompt,
          messages: this.conversationHistory,
        }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const assistantMsg = data.content?.[0]?.text || 'عذراً، لم أتمكن من معالجة طلبك.';
      this.conversationHistory.push({ role: 'assistant', content: assistantMsg });
      if (onChunk) onChunk(assistantMsg);
      return assistantMsg;
    } catch (err) {
      console.error('ONVO AI error:', err);
      const fallback = this.getOfflineResponse(userMessage);
      this.conversationHistory.push({ role: 'assistant', content: fallback });
      if (onChunk) onChunk(fallback);
      return fallback;
    }
  },

  getOfflineResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('مهم') || m.includes('task'))
      return '📋 بناءً على الوضع الحالي، أنصح بإعطاء الأولوية لتصميم الصفحة الرئيسية ونصوص الحملة — لها أعلى تأثير على العملاء هذا الأسبوع.';
    if (m.includes('فريق') || m.includes('عضو'))
      return '👥 فريقك يحقق معدل إنجاز ٧٨٪ هذا الأسبوع. سارة ونور الأعلى أداءً. فكّر في إعادة توزيع بعض مهام كريم.';
    if (m.includes('عميل') || m.includes('client'))
      return '🏢 TechFlow وسكاي ميديا أقوى عملائك هذا الشهر. نوفا بيلد قريب من التسليم — مكالمة مراجعة سريعة قد تُغلق المشروع.';
    if (m.includes('خط') || m.includes('أسبوع') || m.includes('plan'))
      return '📅 اقتراح الأسبوع: الإثنين والثلاثاء للإنتاج الإبداعي، الأربعاء لمراجعات العملاء، الخميس للتسليم، الجمعة للجودة. السبت احتياطي.';
    if (m.includes('حماس') || m.includes('تحفيز') || m.includes('إلهام'))
      return '✨ "التحسينات الصغيرة اليومية هي مفتاح النتائج الكبيرة على المدى البعيد." فريقك أنجز ٣٣ مهمة هذا الأسبوع — رائع جداً!';
    if (m.includes('تقرير') || m.includes('أداء'))
      return '📊 هذا الأسبوع: ٣٣ مهمة منجزة، ٥ عملاء نشطون، معدل إنجاز ٧٨٪ (+٥٪ مقارنة بالأسبوع الماضي). الفريق في تصاعد مستمر!';
    return '🤖 أنا هنا للمساعدة! يمكنك سؤالي عن توزيع المهام، أداء الفريق، استراتيجيات العملاء، أو التخطيط الأسبوعي. بماذا تريد أن تبدأ؟';
  },

  clearHistory() { this.conversationHistory = []; }
};

// ── معالج واجهة المحادثة ──
async function sendAI() {
  const input = document.getElementById('aiInput');
  const area  = document.getElementById('aiChatArea');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';

  area.innerHTML += `
    <div class="ai-message user">
      <div class="ai-avatar" style="background:linear-gradient(135deg,#22d3a4,#4f8ef7)">${getUserInitials()}</div>
      <div class="ai-bubble">${escapeHtml(msg)}</div>
    </div>`;
  area.scrollTop = area.scrollHeight;

  const typingId = 'typing-' + Date.now();
  area.innerHTML += `
    <div class="ai-message" id="${typingId}">
      <div class="ai-avatar">⬡</div>
      <div class="ai-bubble" style="padding:12px 16px">
        <div class="ai-typing"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  area.scrollTop = area.scrollHeight;

  const reply = await ONVO_AI.chat(msg);

  const typingEl = document.getElementById(typingId);
  if (typingEl) {
    typingEl.outerHTML = `
      <div class="ai-message">
        <div class="ai-avatar">⬡</div>
        <div class="ai-bubble">${formatAIReply(reply)}</div>
      </div>`;
  }
  area.scrollTop = area.scrollHeight;
}

function getUserInitials() {
  try {
    const user = JSON.parse(sessionStorage.getItem('onvo_user') || '{}');
    return (user.name || 'م').split(' ').slice(0,2).map(n=>n[0]).join('');
  } catch { return 'م'; }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatAIReply(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
}
