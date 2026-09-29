/**
 * ============================================================================
 * Scientific Calculator - Elegant Pink Edition
 * 
 * Features:
 * - Mathematical expression parsing with recursive descent & operator precedence
 * - Full trigonometric & inverse trigonometric functions (DEG & RAD modes)
 * - Exponentiation, roots, logarithms, factorials, percentages, reciprocals
 * - Safe evaluation preventing NaN, Infinity, or unhandled errors
 * - Dynamic real-time calculation preview
 * - Persistent calculation history via localStorage with instant recall
 * - Keyboard support with interactive visual button feedback
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. MATHEMATICAL ENGINE & EVALUATOR
// ============================================================================

class ScientificMathEngine {
  constructor() {
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
  }

  setAngleMode(mode) {
    this.angleMode = mode === 'RAD' ? 'RAD' : 'DEG';
  }

  toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  /**
   * Calculates factorial for non-negative integers up to 170.
   */
  factorial(n) {
    if (!Number.isInteger(n)) {
      throw new Error("Factorial requires an integer");
    }
    if (n < 0) {
      throw new Error("Factorial of negative number");
    }
    if (n > 170) {
      throw new Error("Factorial overflow (>170!)");
    }
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Automatically closes any unclosed parentheses in the expression.
   */
  autoCloseParens(expr) {
    let openCount = 0;
    for (const char of expr) {
      if (char === '(') openCount++;
      else if (char === ')') openCount = Math.max(0, openCount - 1);
    }
    return expr + ')'.repeat(openCount);
  }

  /**
   * Tokenizes mathematical expression string into typed tokens.
   */
  tokenize(rawExpr) {
    // Normalize display symbols to mathematical identifiers
    let expr = rawExpr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/–/g, '-')
      .replace(/π/g, 'PI')
      .replace(/sin⁻¹/g, 'asin')
      .replace(/cos⁻¹/g, 'acos')
      .replace(/tan⁻¹/g, 'atan')
      .replace(/√/g, 'sqrt')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3');

    const tokens = [];
    let i = 0;

    const isDigit = ch => /[0-9]/.test(ch);
    const isLetter = ch => /[a-zA-Z]/.test(ch);

    while (i < expr.length) {
      const ch = expr[i];

      // Ignore whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers and decimals)
      if (isDigit(ch) || (ch === '.' && isDigit(expr[i + 1]))) {
        let numStr = '';
        let hasDot = false;
        while (i < expr.length && (isDigit(expr[i]) || expr[i] === '.')) {
          if (expr[i] === '.') {
            if (hasDot) break;
            hasDot = true;
          }
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Identifiers: Constants & Functions
      if (isLetter(ch)) {
        let ident = '';
        while (i < expr.length && isLetter(expr[i])) {
          ident += expr[i];
          i++;
        }
        if (ident === 'PI') {
          tokens.push({ type: 'CONST', value: Math.PI });
        } else if (ident === 'e' || ident === 'E') {
          tokens.push({ type: 'CONST', value: Math.E });
        } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'].includes(ident)) {
          tokens.push({ type: 'FUNC', value: ident });
        } else {
          throw new Error(`Unknown identifier: ${ident}`);
        }
        continue;
      }

      // Operators and Parentheses
      if ('+-*/^%!(),'.includes(ch)) {
        tokens.push({ type: 'OP', value: ch });
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${ch}`);
    }

    // Distinguish postfix '%' from binary modulo '%'
    // If '%' is followed by a NUMBER, CONST, FUNC, or '(', it is binary modulo OP '%'
    // Otherwise, it is postfix percentage OP 'PCT'
    const tokenList = [];
    for (let j = 0; j < tokens.length; j++) {
      const curr = tokens[j];
      if (curr.type === 'OP' && curr.value === '%') {
        const next = tokens[j + 1];
        if (next && (next.type === 'NUMBER' || next.type === 'CONST' || next.type === 'FUNC' || (next.type === 'OP' && next.value === '('))) {
          tokenList.push({ type: 'OP', value: '%' }); // binary modulo
        } else {
          tokenList.push({ type: 'OP', value: 'PCT' }); // postfix percentage
        }
      } else {
        tokenList.push(curr);
      }
    }

    // Insert implicit multiplication tokens (e.g. 2π -> 2 * π, 2(3) -> 2 * (3))
    const processed = [];
    for (let j = 0; j < tokenList.length; j++) {
      const curr = tokenList[j];
      processed.push(curr);

      if (j < tokenList.length - 1) {
        const next = tokenList[j + 1];
        const currCanMultiply =
          curr.type === 'NUMBER' ||
          curr.type === 'CONST' ||
          (curr.type === 'OP' && curr.value === ')') ||
          (curr.type === 'OP' && curr.value === '!') ||
          (curr.type === 'OP' && curr.value === 'PCT');

        const nextCanBeMultiplied =
          next.type === 'NUMBER' ||
          next.type === 'CONST' ||
          next.type === 'FUNC' ||
          (next.type === 'OP' && next.value === '(');

        if (currCanMultiply && nextCanBeMultiplied) {
          processed.push({ type: 'OP', value: '*' });
        }
      }
    }

    return processed;
  }

  /**
   * Applies scientific function with angle mode and domain checks.
   */
  applyFunction(fn, x) {
    switch (fn) {
      case 'sin': {
        if (this.angleMode === 'DEG') {
          const mod = Math.abs(x % 180);
          if (mod === 0) return 0;
          return Math.sin(this.toRad(x));
        }
        return Math.sin(x);
      }
      case 'cos': {
        if (this.angleMode === 'DEG') {
          const mod = Math.abs(x % 360);
          if (mod === 90 || mod === 270) return 0;
          return Math.cos(this.toRad(x));
        }
        return Math.cos(x);
      }
      case 'tan': {
        if (this.angleMode === 'DEG') {
          const mod = Math.abs(x % 180);
          if (mod === 90) throw new Error("Undefined (tan 90°)");
          if (mod === 0) return 0;
          return Math.tan(this.toRad(x));
        }
        return Math.tan(x);
      }
      case 'asin': {
        if (x < -1 || x > 1) throw new Error("Domain Error (-1 ≤ x ≤ 1)");
        const res = Math.asin(x);
        return this.angleMode === 'DEG' ? this.toDeg(res) : res;
      }
      case 'acos': {
        if (x < -1 || x > 1) throw new Error("Domain Error (-1 ≤ x ≤ 1)");
        const res = Math.acos(x);
        return this.angleMode === 'DEG' ? this.toDeg(res) : res;
      }
      case 'atan': {
        const res = Math.atan(x);
        return this.angleMode === 'DEG' ? this.toDeg(res) : res;
      }
      case 'log': {
        if (x <= 0) throw new Error("Domain Error (x > 0)");
        return Math.log10(x);
      }
      case 'ln': {
        if (x <= 0) throw new Error("Domain Error (x > 0)");
        return Math.log(x);
      }
      case 'sqrt': {
        if (x < 0) throw new Error("Domain Error (x ≥ 0)");
        return Math.sqrt(x);
      }
      default:
        throw new Error(`Unknown function: ${fn}`);
    }
  }

  /**
   * Recursive descent parser evaluating expressions by mathematical precedence.
   */
  evaluate(rawExpr) {
    if (!rawExpr || !rawExpr.trim()) return 0;
    const closedExpr = this.autoCloseParens(rawExpr);
    const tokens = this.tokenize(closedExpr);
    if (tokens.length === 0) return 0;

    let pos = 0;

    const peek = () => tokens[pos] || null;
    const consume = () => tokens[pos++];

    // Level 1: Addition & Subtraction
    const parseExpression = () => {
      let left = parseTerm();
      while (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };

    // Level 2: Multiplication, Division, Modulo
    const parseTerm = () => {
      let left = parsePower();
      while (peek() && peek().type === 'OP' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        const op = consume().value;
        const right = parsePower();
        if (op === '*') {
          left = left * right;
        } else if (op === '/') {
          if (right === 0) throw new Error("Cannot divide by 0");
          left = left / right;
        } else if (op === '%') {
          if (right === 0) throw new Error("Cannot divide by 0");
          left = left % right;
        }
      }
      return left;
    };

    // Level 3: Exponentiation (right-associative)
    const parsePower = () => {
      let left = parseUnary();
      if (peek() && peek().type === 'OP' && peek().value === '^') {
        consume(); // eat '^'
        const right = parsePower();
        left = Math.pow(left, right);
      }
      return left;
    };

    // Level 4: Unary operators (+, -)
    const parseUnary = () => {
      if (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const val = parseUnary();
        return op === '-' ? -val : val;
      }
      return parsePostfix();
    };

    // Level 5: Postfix operators (! and percentage %)
    const parsePostfix = () => {
      let val = parsePrimary();
      while (peek() && peek().type === 'OP' && (peek().value === '!' || peek().value === 'PCT')) {
        const op = consume().value;
        if (op === '!') {
          val = this.factorial(val);
        } else if (op === 'PCT') {
          val = val / 100;
        }
      }
      return val;
    };

    // Level 6: Primaries (numbers, constants, functions, parenthesized expressions)
    const parsePrimary = () => {
      const token = peek();
      if (!token) throw new Error("Unexpected end of expression");

      if (token.type === 'NUMBER') {
        consume();
        return token.value;
      }

      if (token.type === 'CONST') {
        consume();
        return token.value;
      }

      if (token.type === 'FUNC') {
        const fnName = consume().value;
        let arg;
        if (peek() && peek().type === 'OP' && peek().value === '(') {
          consume(); // eat '('
          arg = parseExpression();
          if (peek() && peek().type === 'OP' && peek().value === ')') {
            consume(); // eat ')'
          }
        } else {
          arg = parseUnary();
        }
        return this.applyFunction(fnName, arg);
      }

      if (token.type === 'OP' && token.value === '(') {
        consume(); // eat '('
        const val = parseExpression();
        if (peek() && peek().type === 'OP' && peek().value === ')') {
          consume(); // eat ')'
        }
        return val;
      }

      throw new Error(`Unexpected token: ${token.value}`);
    };

    const result = parseExpression();

    if (pos < tokens.length) {
      throw new Error("Syntax error");
    }

    if (isNaN(result) || !isFinite(result)) {
      throw new Error("Invalid calculation");
    }

    return result;
  }

  /**
   * Formats numeric output cleanly, removing floating-point precision artifacts.
   */
  formatResult(num) {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
      return "Error";
    }

    // Eliminate minor float inaccuracies (e.g. 0.1 + 0.2)
    let rounded = parseFloat(num.toPrecision(12));

    if (Math.abs(rounded - Math.round(rounded)) < 1e-12) {
      rounded = Math.round(rounded);
    }

    // Use exponential notation for massive or microscopic values
    if (Math.abs(rounded) >= 1e14 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
      return rounded.toExponential(6).replace(/\+?e/, 'e');
    }

    return rounded.toString();
  }
}

// ============================================================================
// 2. USER INTERFACE & STATE MANAGEMENT
// ============================================================================

class ScientificCalculatorUI {
  constructor() {
    this.engine = new ScientificMathEngine();
    this.expression = '';
    this.lastResult = null;
    this.isResultMode = false; // Flag for when display shows calculated answer
    this.history = [];
    this.storageKey = 'rose_calc_history_v1';

    this.initDOMElements();
    this.initEventListeners();
    this.loadHistory();
    this.updateDisplay();
  }

  /**
   * Cache references to DOM elements.
   */
  initDOMElements() {
    this.expressionDisplay = document.getElementById('expressionDisplay');
    this.mainDisplay = document.getElementById('mainDisplay');
    this.previewDisplay = document.getElementById('previewDisplay');
    this.parenChip = document.getElementById('parenChip');
    this.angleStatusChip = document.getElementById('currentAngleChip');

    this.degRadBtn = document.getElementById('degRadBtn');
    this.degLabel = document.getElementById('degLabel');
    this.radLabel = document.getElementById('radLabel');

    this.copyBtn = document.getElementById('copyBtn');
    this.copyToast = document.getElementById('copyToast');

    this.historyToggleBtn = document.getElementById('historyToggleBtn');
    this.historyBadge = document.getElementById('historyBadge');
    this.historyPanel = document.getElementById('historyPanel');
    this.historyBackdrop = document.getElementById('historyBackdrop');
    this.historyList = document.getElementById('historyList');
    this.historyEmpty = document.getElementById('historyEmpty');
    this.historyCountTag = document.getElementById('historyCountTag');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
  }

  /**
   * Bind event listeners for UI buttons, keyboard, and history.
   */
  initEventListeners() {
    // Keypad button click delegation
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleButtonAction(btn);
        this.triggerButtonHaptic(btn);
      });
    });

    // Angle mode switch (DEG/RAD)
    this.degRadBtn.addEventListener('click', () => this.toggleAngleMode());

    // Copy result button
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());

    // History drawer controls
    this.historyToggleBtn.addEventListener('click', () => this.toggleHistoryDrawer());
    this.closeHistoryBtn.addEventListener('click', () => this.closeHistoryDrawer());
    this.historyBackdrop.addEventListener('click', () => this.closeHistoryDrawer());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
  }

  /**
   * Handles action triggered by an on-screen button.
   */
  handleButtonAction(btn) {
    const action = btn.dataset.action;
    const val = btn.dataset.val;

    // Reset error state on new input
    if (this.mainDisplay.classList.contains('error-state')) {
      this.clearAll();
    }

    switch (action) {
      case 'num':
        this.inputNumber(val);
        break;
      case 'dot':
        this.inputDecimal();
        break;
      case 'operator':
        this.inputOperator(val);
        break;
      case 'func':
        this.inputFunction(val);
        break;
      case 'const':
        this.inputConstant(val);
        break;
      case 'paren':
        this.inputParenthesis(val);
        break;
      case 'square':
        this.inputSquare();
        break;
      case 'power':
        this.inputPower();
        break;
      case 'reciprocal':
        this.inputReciprocal();
        break;
      case 'factorial':
        this.inputFactorial();
        break;
      case 'negate':
        this.toggleSign();
        break;
      case 'clear':
        this.clearAll();
        break;
      case 'delete':
        this.deleteLast();
        break;
      case 'calculate':
        this.calculateResult();
        break;
    }

    this.updateDisplay();
  }

  /**
   * Digit input handler (0-9, 00).
   */
  inputNumber(numStr) {
    if (this.isResultMode) {
      this.expression = '';
      this.isResultMode = false;
    }
    if (this.expression === '0' && numStr !== '00') {
      this.expression = numStr;
    } else {
      this.expression += numStr;
    }
  }

  /**
   * Decimal point handler (prevents duplicate decimals in same number token).
   */
  inputDecimal() {
    if (this.isResultMode) {
      this.expression = '0.';
      this.isResultMode = false;
      return;
    }

    // Extract last number token
    const match = this.expression.match(/([0-9.]+)$/);
    if (match) {
      if (match[1].includes('.')) return; // already has decimal
      this.expression += '.';
    } else {
      // If preceded by operator or empty
      if (!this.expression || /[+\−×÷(]$/.test(this.expression)) {
        this.expression += '0.';
      } else {
        this.expression += '.';
      }
    }
  }

  /**
   * Basic operators handler (+, −, ×, ÷, %).
   */
  inputOperator(op) {
    if (this.isResultMode) {
      this.isResultMode = false;
    }

    if (!this.expression) {
      if (this.lastResult !== null) {
        this.expression = this.lastResult.toString() + ' ' + op + ' ';
      } else if (op === '−') {
        this.expression = '−';
      }
      return;
    }

    // If expression ends with an operator, replace it
    const trimmed = this.expression.trimEnd();
    if (/[+−×÷%]$/.test(trimmed)) {
      this.expression = trimmed.slice(0, -1).trimEnd() + ' ' + op + ' ';
    } else {
      this.expression += ' ' + op + ' ';
    }
  }

  /**
   * Function insertion handler (sin(, cos(, log(, etc.).
   */
  inputFunction(funcStr) {
    if (this.isResultMode) {
      this.expression = '';
      this.isResultMode = false;
    }
    this.expression += funcStr;
  }

  /**
   * Constant insertion handler (π, e).
   */
  inputConstant(constStr) {
    if (this.isResultMode) {
      this.expression = '';
      this.isResultMode = false;
    }
    this.expression += constStr;
  }

  /**
   * Parentheses handler with pairing balance.
   */
  inputParenthesis(paren) {
    if (this.isResultMode) {
      this.expression = '';
      this.isResultMode = false;
    }
    this.expression += paren;
  }

  /**
   * Square (x²) handler.
   */
  inputSquare() {
    if (this.isResultMode) {
      this.isResultMode = false;
    }
    if (!this.expression && this.lastResult !== null) {
      this.expression = this.lastResult.toString() + '²';
      return;
    }
    if (this.expression && !/[+−×÷^(\s]$/.test(this.expression)) {
      this.expression += '²';
    }
  }

  /**
   * Exponent (xʸ) power handler.
   */
  inputPower() {
    if (this.isResultMode) {
      this.isResultMode = false;
    }
    if (!this.expression && this.lastResult !== null) {
      this.expression = this.lastResult.toString() + '^';
      return;
    }
    if (this.expression && !/[+−×÷^(\s]$/.test(this.expression)) {
      this.expression += '^';
    }
  }

  /**
   * Reciprocal (1/x) handler.
   */
  inputReciprocal() {
    if (this.isResultMode && this.lastResult !== null) {
      this.expression = `1/(${this.lastResult})`;
      this.isResultMode = false;
      return;
    }

    if (!this.expression) {
      this.expression = '1/(';
      return;
    }

    // Wrap the trailing number or parenthesized group in 1/(...)
    const numMatch = this.expression.match(/([0-9.]+|π|e|\([^()]+\))$/);
    if (numMatch) {
      const target = numMatch[1];
      this.expression = this.expression.slice(0, -target.length) + `1/(${target})`;
    } else {
      this.expression += '1/(';
    }
  }

  /**
   * Factorial (!) handler.
   */
  inputFactorial() {
    if (this.isResultMode) {
      this.isResultMode = false;
    }
    if (!this.expression && this.lastResult !== null) {
      this.expression = this.lastResult.toString() + '!';
      return;
    }
    if (this.expression && !/[+−×÷^(!\s]$/.test(this.expression)) {
      this.expression += '!';
    }
  }

  /**
   * Plus/Minus (±) sign toggle handler.
   */
  toggleSign() {
    if (this.isResultMode && this.lastResult !== null) {
      this.expression = (-this.lastResult).toString();
      this.isResultMode = false;
      return;
    }

    if (!this.expression) {
      this.expression = '−';
      return;
    }

    // If currently just a minus sign, remove it
    if (this.expression === '−' || this.expression === '-') {
      this.expression = '';
      return;
    }

    // Toggle negation on trailing number or parenthesized group
    const negGroupRegex = /\(−\s*([0-9.]+|π|e)\)$/;
    if (negGroupRegex.test(this.expression)) {
      this.expression = this.expression.replace(negGroupRegex, '$1');
      return;
    }

    const numRegex = /([0-9.]+|π|e)$/;
    if (numRegex.test(this.expression)) {
      this.expression = this.expression.replace(numRegex, '(−$1)');
      return;
    }

    // Fallback: wrap entire expression
    if (this.expression.startsWith('−(') && this.expression.endsWith(')')) {
      this.expression = this.expression.slice(2, -1);
    } else {
      this.expression = `−(${this.expression})`;
    }
  }

  /**
   * Backspace delete last character or token.
   */
  deleteLast() {
    if (this.isResultMode) {
      this.isResultMode = false;
      return;
    }

    if (!this.expression) return;

    // Check for multi-character functions to remove cleanly in one backspace
    const multiCharTokens = [
      'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
      'sin(', 'cos(', 'tan(',
      'log(', 'ln(', '1/(', '√(',
      ' + ', ' − ', ' × ', ' ÷ '
    ];

    for (const token of multiCharTokens) {
      if (this.expression.endsWith(token)) {
        this.expression = this.expression.slice(0, -token.length);
        return;
      }
    }

    this.expression = this.expression.slice(0, -1);
  }

  /**
   * All Clear (AC) resets current formula and display.
   */
  clearAll() {
    this.expression = '';
    this.isResultMode = false;
    this.mainDisplay.classList.remove('error-state');
    this.mainDisplay.textContent = '0';
    this.expressionDisplay.textContent = '';
    this.previewDisplay.textContent = '';
    this.updateParenChip();
  }

  /**
   * Executes calculation, updates history, and sets result mode.
   */
  calculateResult() {
    if (!this.expression || !this.expression.trim()) return;

    const originalExpr = this.expression.trim();

    try {
      const rawAnswer = this.engine.evaluate(originalExpr);
      const formattedAnswer = this.engine.formatResult(rawAnswer);

      if (formattedAnswer === "Error") {
        this.showError("Calculation Error");
        return;
      }

      // Record to History
      this.addHistoryItem(originalExpr, formattedAnswer);

      // Update state
      this.lastResult = parseFloat(formattedAnswer);
      this.expressionDisplay.textContent = `${originalExpr} =`;
      this.mainDisplay.textContent = formattedAnswer;
      this.mainDisplay.classList.remove('error-state');
      this.previewDisplay.textContent = '';
      this.expression = formattedAnswer;
      this.isResultMode = true;

      this.adjustFontSize(formattedAnswer);
    } catch (err) {
      this.showError(err.message || "Invalid Expression");
    }
  }

  /**
   * Displays friendly error state without breaking application.
   */
  showError(message) {
    this.expressionDisplay.textContent = this.expression;
    this.mainDisplay.textContent = message;
    this.mainDisplay.classList.add('error-state');
    this.previewDisplay.textContent = '';
    this.isResultMode = true;
  }

  /**
   * Updates display text, live preview, unclosed parentheses counter, and typography scaling.
   */
  updateDisplay() {
    if (this.isResultMode) return;

    if (!this.expression) {
      this.mainDisplay.textContent = '0';
      this.expressionDisplay.textContent = '';
      this.previewDisplay.textContent = '';
      this.mainDisplay.classList.remove('error-state');
      this.adjustFontSize('0');
      this.updateParenChip();
      return;
    }

    this.mainDisplay.textContent = this.expression;
    this.mainDisplay.classList.remove('error-state');
    this.adjustFontSize(this.expression);
    this.updateParenChip();

    // Auto-scroll expression container to right as user types
    const container = document.querySelector('.display-main-container');
    if (container) {
      container.scrollLeft = container.scrollWidth;
    }

    // Real-time dynamic calculation preview (if formula is non-trivial and valid)
    if (/[+−×÷^%!()]/.test(this.expression)) {
      try {
        const previewVal = this.engine.evaluate(this.expression);
        const formatted = this.engine.formatResult(previewVal);
        if (formatted !== "Error" && formatted !== this.expression.trim()) {
          this.previewDisplay.textContent = `= ${formatted}`;
        } else {
          this.previewDisplay.textContent = '';
        }
      } catch {
        this.previewDisplay.textContent = '';
      }
    } else {
      this.previewDisplay.textContent = '';
    }
  }

  /**
   * Dynamically adjusts display font size for long numbers/expressions.
   */
  adjustFontSize(str) {
    this.mainDisplay.classList.remove('text-medium', 'text-small');
    if (str.length > 15) {
      this.mainDisplay.classList.add('text-small');
    } else if (str.length > 9) {
      this.mainDisplay.classList.add('text-medium');
    }
  }

  /**
   * Tracks and shows unclosed parentheses count chip.
   */
  updateParenChip() {
    let openCount = 0;
    for (const ch of this.expression) {
      if (ch === '(') openCount++;
      else if (ch === ')') openCount = Math.max(0, openCount - 1);
    }

    if (openCount > 0) {
      this.parenChip.textContent = `( ) ${openCount}`;
      this.parenChip.classList.remove('hidden');
    } else {
      this.parenChip.classList.add('hidden');
    }
  }

  /**
   * Toggles angle calculation mode between DEG and RAD.
   */
  toggleAngleMode() {
    const newMode = this.engine.angleMode === 'DEG' ? 'RAD' : 'DEG';
    this.engine.setAngleMode(newMode);

    if (newMode === 'RAD') {
      this.degRadBtn.classList.add('is-rad');
      this.degLabel.classList.remove('active');
      this.radLabel.classList.add('active');
      this.angleStatusChip.textContent = 'RAD';
      this.degRadBtn.setAttribute('aria-label', 'Toggle Angle Mode: Current is RAD');
    } else {
      this.degRadBtn.classList.remove('is-rad');
      this.degLabel.classList.add('active');
      this.radLabel.classList.remove('active');
      this.angleStatusChip.textContent = 'DEG';
      this.degRadBtn.setAttribute('aria-label', 'Toggle Angle Mode: Current is DEG');
    }

    // Refresh live preview if currently typing trigonometric expression
    this.updateDisplay();
  }

  /**
   * Copies current primary answer to clipboard with animated visual tooltip.
   */
  async copyToClipboard() {
    const textToCopy = this.mainDisplay.textContent;
    if (!textToCopy || textToCopy === '0' || this.mainDisplay.classList.contains('error-state')) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.copyToast.classList.add('show');
      setTimeout(() => {
        this.copyToast.classList.remove('show');
      }, 1500);
    } catch {
      // Fallback for restricted clipboard permissions
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      this.copyToast.classList.add('show');
      setTimeout(() => {
        this.copyToast.classList.remove('show');
      }, 1500);
    }
  }

  // ==========================================================================
  // 3. CALCULATION HISTORY MANAGEMENT
  // ==========================================================================

  /**
   * Adds completed calculation to history, updates localStorage, and updates UI.
   */
  addHistoryItem(expr, result) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = {
      id: Date.now().toString(),
      expression: expr,
      result: result,
      time: timeStr,
      timestamp: Date.now()
    };

    // Prepend newest calculation at the top
    this.history.unshift(item);

    // Limit history to 50 items
    if (this.history.length > 50) {
      this.history.pop();
    }

    this.saveHistory();
    this.renderHistory();
  }

  /**
   * Loads calculation history from localStorage.
   */
  loadHistory() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.history = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Could not load calculation history from localStorage:", e);
      this.history = [];
    }
    this.renderHistory();
  }

  /**
   * Saves calculation history to localStorage.
   */
  saveHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (e) {
      console.warn("Could not save calculation history to localStorage:", e);
    }
  }

  /**
   * Clears calculation history with user confirmation.
   */
  clearHistory() {
    if (this.history.length === 0) return;
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  }

  /**
   * Renders calculation history list and updates count badges.
   */
  renderHistory() {
    const count = this.history.length;
    this.historyBadge.textContent = count;
    this.historyCountTag.textContent = count;

    if (count === 0) {
      this.historyList.innerHTML = '';
      this.historyEmpty.classList.remove('hidden');
      return;
    }

    this.historyEmpty.classList.add('hidden');
    this.historyList.innerHTML = '';

    this.history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Calculation: ${item.expression} = ${item.result} at ${item.time}`);

      li.innerHTML = `
        <div class="history-item-meta">
          <span class="history-time">${item.time}</span>
          <div class="history-action-chips">
            <button class="history-mini-btn btn-ans" type="button" title="Insert answer">Ans</button>
            <button class="history-mini-btn btn-recall" type="button" title="Recall formula">Replay</button>
          </div>
        </div>
        <div class="history-expr">${this.escapeHTML(item.expression)} =</div>
        <div class="history-result">${this.escapeHTML(item.result)}</div>
      `;

      // Click on whole card or "Ans" button to use result
      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-recall')) {
          e.stopPropagation();
          this.recallExpression(item.expression);
        } else {
          this.useResultInCalculation(item.result);
        }
      });

      this.historyList.appendChild(li);
    });
  }

  /**
   * Reuses previous calculation result as input.
   */
  useResultInCalculation(resultStr) {
    if (this.isResultMode) {
      this.expression = resultStr;
      this.isResultMode = false;
    } else {
      // If current expression ends with operator or is empty, append result
      if (!this.expression || /[+−×÷^(\s]$/.test(this.expression)) {
        this.expression += resultStr;
      } else {
        this.expression = resultStr;
      }
    }
    this.updateDisplay();
    this.closeHistoryDrawer();
  }

  /**
   * Recalls previous full formula back into display for editing.
   */
  recallExpression(exprStr) {
    this.expression = exprStr;
    this.isResultMode = false;
    this.updateDisplay();
    this.closeHistoryDrawer();
  }

  /**
   * Mobile history drawer toggle.
   */
  toggleHistoryDrawer() {
    const isOpen = this.historyPanel.classList.contains('drawer-open');
    if (isOpen) {
      this.closeHistoryDrawer();
    } else {
      this.openHistoryDrawer();
    }
  }

  openHistoryDrawer() {
    this.historyPanel.classList.add('drawer-open');
    this.historyBackdrop.classList.add('active');
  }

  closeHistoryDrawer() {
    this.historyPanel.classList.remove('drawer-open');
    this.historyBackdrop.classList.remove('active');
  }

  // ==========================================================================
  // 4. KEYBOARD SUPPORT & TACTILE FEEDBACK
  // ==========================================================================

  /**
   * Handles physical keyboard input with comprehensive key mappings.
   */
  handleKeyboardInput(e) {
    // Ignore keyboard input if focus is inside an input field
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key;

    // Numbers 0-9
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      this.triggerKeyButton(`[data-action="num"][data-val="${key}"]`);
      this.inputNumber(key);
      this.updateDisplay();
      return;
    }

    // Decimal point
    if (key === '.') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="dot"]');
      this.inputDecimal();
      this.updateDisplay();
      return;
    }

    // Operators
    if (key === '+') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="operator"][data-val="+"]');
      this.inputOperator('+');
      this.updateDisplay();
      return;
    }
    if (key === '-') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="operator"][data-val="−"]');
      this.inputOperator('−');
      this.updateDisplay();
      return;
    }
    if (key === '*') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="operator"][data-val="×"]');
      this.inputOperator('×');
      this.updateDisplay();
      return;
    }
    if (key === '/') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="operator"][data-val="÷"]');
      this.inputOperator('÷');
      this.updateDisplay();
      return;
    }
    if (key === '%') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="operator"][data-val="%"]');
      this.inputOperator('%');
      this.updateDisplay();
      return;
    }

    // Parentheses
    if (key === '(' || key === ')') {
      e.preventDefault();
      this.triggerKeyButton(`[data-action="paren"][data-val="${key}"]`);
      this.inputParenthesis(key);
      this.updateDisplay();
      return;
    }

    // Power
    if (key === '^') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="power"]');
      this.inputPower();
      this.updateDisplay();
      return;
    }

    // Factorial
    if (key === '!') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="factorial"]');
      this.inputFactorial();
      this.updateDisplay();
      return;
    }

    // Calculate (Enter or =)
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="calculate"]');
      this.calculateResult();
      return;
    }

    // Backspace
    if (key === 'Backspace') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="delete"]');
      this.deleteLast();
      this.updateDisplay();
      return;
    }

    // Escape (AC)
    if (key === 'Escape') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="clear"]');
      this.clearAll();
      return;
    }

    // Inverse Trig shortcut keys (Shift + S, C, T)
    if (key === 'S') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="sin⁻¹("]');
      this.inputFunction('sin⁻¹(');
      this.updateDisplay();
      return;
    }
    if (key === 'C') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="cos⁻¹("]');
      this.inputFunction('cos⁻¹(');
      this.updateDisplay();
      return;
    }
    if (key === 'T') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="tan⁻¹("]');
      this.inputFunction('tan⁻¹(');
      this.updateDisplay();
      return;
    }

    // Math function shortcut keys
    const lowerKey = key.toLowerCase();
    if (lowerKey === 's') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="sin("]');
      this.inputFunction('sin(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'c') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="cos("]');
      this.inputFunction('cos(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 't') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="tan("]');
      this.inputFunction('tan(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'l') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="log("]');
      this.inputFunction('log(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'n') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="ln("]');
      this.inputFunction('ln(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'r' || lowerKey === 'q') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="func"][data-val="√("]');
      this.inputFunction('√(');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'p') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="const"][data-val="π"]');
      this.inputConstant('π');
      this.updateDisplay();
      return;
    }
    if (lowerKey === 'e') {
      e.preventDefault();
      this.triggerKeyButton('[data-action="const"][data-val="e"]');
      this.inputConstant('e');
      this.updateDisplay();
      return;
    }
  }

  /**
   * Triggers visual press ripple on matching on-screen button.
   */
  triggerKeyButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      this.triggerButtonHaptic(btn);
    }
  }

  triggerButtonHaptic(btn) {
    btn.classList.add('btn-pressed');
    setTimeout(() => {
      btn.classList.remove('btn-pressed');
    }, 120);
  }

  /**
   * Helper to prevent XSS in rendered history expressions.
   */
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ============================================================================
// 5. APPLICATION INITIALIZATION
// ============================================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.roseCalc = new ScientificCalculatorUI();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScientificMathEngine, ScientificCalculatorUI };
}
