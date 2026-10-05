(function(root){
  'use strict';
  var LANGS={
    c:{name:'C',bin:{'*':[13],'/':[13],'%':[13],'+':[12],'-':[12],'<<':[11],'>>':[11],'<':[10],'<=':[10],'>':[10],'>=':[10],'==':[9],'!=':[9],'&':[8],'^':[7],'|':[6],'&&':[5],'||':[4]},un:{'!':14,'~':14,'-':14,'+':14}},
    js:{name:'JavaScript',bin:{'**':[15,1],'*':[13],'/':[13],'%':[13],'+':[12],'-':[12],'<<':[11],'>>':[11],'<':[10],'<=':[10],'>':[10],'>=':[10],'==':[9],'!=':[9],'&':[8],'^':[7],'|':[6],'&&':[5],'||':[4]},un:{'!':16,'~':16,'-':16,'+':16}},
    py:{name:'Python',bin:{'**':[15,1],'*':[13],'/':[13],'//':[13],'%':[13],'+':[12],'-':[12],'<<':[11],'>>':[11],'&':[10],'^':[9],'|':[8],'<':[7,0,1],'<=':[7,0,1],'>':[7,0,1],'>=':[7,0,1],'==':[7,0,1],'!=':[7,0,1],'and':[5],'or':[4]},un:{'~':14,'-':14,'+':14,'not':7}},
    sql:{name:'SQLite',bin:{'||':[16],'*':[15],'/':[15],'%':[15],'+':[14],'-':[14],'&':[13],'|':[13],'<<':[13],'>>':[13],'<':[12],'<=':[12],'>':[12],'>=':[12],'=':[11],'==':[11],'!=':[11],'<>':[11],'AND':[9],'OR':[8]},un:{'~':17,'-':17,'+':17,'NOT':11}}
  };
  var OPS=['<<','>>','<=','>=','==','!=','<>','&&','||','**','//','+','-','*','/','%','<','>','&','|','^','~','!','=','(',')'];
  function lex(s,L){
    var t=[],i=0,m,commented=false;
    while(i<s.length){
      var c=s[i];
      if(/\s/.test(c)){i++;continue;}
      if(L==='sql'&&s.substr(i,2)==='--'){commented=true;break;}
      if((L==='c'||L==='js')&&(s.substr(i,2)==='--'||s.substr(i,2)==='++'))throw new Error('"'+s.substr(i,2)+'" is the '+(s[i]==='-'?'decrement':'increment')+' operator in '+LANGS[L].name+'; write "'+s[i]+' '+s[i]+'" with a space');
      if((m=/^\d+/.exec(s.slice(i)))){if(/^[A-Za-z_]/.test(s[i+m[0].length]||''))throw new Error('Bad number near "'+s.slice(i,i+m[0].length+1)+'"');t.push({k:'num',v:m[0]});i+=m[0].length;continue;}
      if((m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)))){var w=m[0],key=L==='sql'?w.toUpperCase():w;
        if((L==='py'&&(w==='and'||w==='or'||w==='not'))||(L==='sql'&&(key==='AND'||key==='OR'||key==='NOT')))t.push({k:'op',v:key});
        else t.push({k:'id',v:w});i+=w.length;continue;}
      var op=null;for(var j=0;j<OPS.length;j++){if(s.substr(i,OPS[j].length)===OPS[j]){op=OPS[j];break;}}
      if(!op)throw new Error('Unexpected character "'+c+'"');
      t.push({k:'op',v:op});i+=op.length;}
    t.commented=commented;return t;}
  function parse(src,L){
    var D=LANGS[L],toks=lex(src,L),p=0;
    function peek(){return toks[p];}
    function expr(minbp){
      var left=nud(minbp);
      for(;;){
        var t=peek();if(!t||t.k!=='op')break;
        var info=D.bin[t.v];
        if(!info){
          if(t.v===')'||D.un[t.v]!==undefined&&!isOpAnywhere(t.v)){break;}
          if(t.v==='(')break;
          if(isOpAnywhere(t.v))throw new Error('"'+t.v+'" is not a binary operator in '+D.name);
          break;}
        var prec=info[0];if(prec<minbp)break;
        p++;
        if(info[2]){ // comparison chain (python)
          var ops=[t.v],items=[left];
          items.push(expr(prec+1));
          while(peek()&&peek().k==='op'&&D.bin[peek().v]&&D.bin[peek().v][2]){ops.push(peek().v);p++;items.push(expr(prec+1));}
          left={t:'chain',ops:ops,items:items};continue;}
        var right=expr(info[1]?prec:prec+1);
        left={t:'bin',op:t.v,l:left,r:right};}
      return left;}
    function isOpAnywhere(v){return Object.keys(LANGS).some(function(k){return LANGS[k].bin[v]||LANGS[k].un[v]!==undefined;})||v==='!'||v==='&&'||v==='||';}
    function nud(minbp){
      var t=toks[p++];
      if(!t)throw new Error('The expression ends where an operand is expected');
      if(t.k==='num')return {t:'num',v:t.v};
      if(t.k==='id')return {t:'id',v:t.v};
      if(t.v==='('){var e=expr(0);var c=toks[p++];if(!c||c.v!==')')throw new Error('Missing ")"');return {t:'paren',e:e};}
      if(L==='py'&&t.v==='not'&&minbp>7)throw new Error('In Python, "not" cannot be the operand of an operator like that; write (not ...) with parentheses');
      if(D.un[t.v]!==undefined){
        var rb=D.un[t.v];var operand=expr(rb);
        if(L==='js'&&peek()&&peek().v==='**')throw new Error('JavaScript rejects a unary operator directly before ** (write (-2)**2 or -(2**2))');
        return {t:'un',op:t.v,e:operand};}
      if(t.v===')')throw new Error('Unexpected ")"');
      if(isOpAnywhere(t.v)&&!D.bin[t.v])throw new Error('"'+t.v+'" is not an operator in '+D.name);
      throw new Error('"'+t.v+'" needs an operand on its left');}
    if(!toks.length)throw new Error('Empty expression');
    var tree=expr(0);
    tree.commented=toks.commented;
    if(p<toks.length)throw new Error(toks[p].v==='('||toks[p].k!=='op'?'Two operands in a row near "'+toks[p].v+'"':'Unexpected "'+toks[p].v+'"');
    return tree;}
  function show(n){
    switch(n.t){
      case 'num':case 'id':return n.v;
      case 'paren':return show(n.e);
      case 'un':return n.op+(/^[A-Za-z]/.test(n.op)?' ':'')+(n.e.t==='num'||n.e.t==='id'||n.e.t==='un'||n.e.t==='paren'?show(n.e):show(n.e));
      case 'bin':return '('+show(n.l)+' '+n.op+' '+show(n.r)+')';
      case 'chain':return '('+n.items.map(show).join('')+')';}
  }
  function showFull(n){
    switch(n.t){
      case 'num':case 'id':return n.v;
      case 'paren':return showFull(n.e);
      case 'un':return (/^[A-Za-z]/.test(n.op)?'('+n.op+' ':'('+n.op)+showFull(n.e)+')';
      case 'bin':return '('+showFull(n.l)+' '+n.op+' '+showFull(n.r)+')';
      case 'chain':var s='';n.items.forEach(function(it,i){s+=(i?' '+n.ops[i-1]+' ':'')+showFull(it);});return '('+s+')';}
  }
  // ---- evaluation (integers only). returns {v:BigInt|null, err?, ub?}
  var I32=function(x){return BigInt.asIntN(32,x);};
  function evalTree(n,L){
    var ub=false;
    function bad(m){var e=new Error(m);e.evalErr=true;throw e;}
    function chk(v){ if(L==='c'&&(v>2147483647n||v<-2147483648n))ub=true; if(L==='js'&&(v>9007199254740992n||v<-9007199254740992n))ub=true; return v;}
    function truthy(v){return v!==0n;}
    function ev(n){
      switch(n.t){
        case 'num':return BigInt(n.v);
        case 'id':bad('has variables');
        case 'paren':return ev(n.e);
        case 'un':{var x=ev(n.e);
          if(n.op==='-')return chk(-x);
          if(n.op==='+')return x;
          if(n.op==='~')return L==='js'?I32(~I32(x)):L==='c'?chk(~x):~x;
          return truthy(x)?0n:1n;} // ! not NOT
        case 'chain':{var vals=n.items.map(ev),ok=true;
          for(var i=0;i<n.ops.length&&ok;i++)ok=cmp(n.ops[i],vals[i],vals[i+1]);return ok?1n:0n;}
        case 'bin':return bin(n);}
    }
    function I64(x){return x;}
    function cmp(op,a,b){switch(op){case '<':return a<b;case '<=':return a<=b;case '>':return a>b;case '>=':return a>=b;case '==':case '=':return a===b;default:return a!==b;}}
    function bin(n){
      var op=n.op;
      if(op==='&&'||op==='and'||op==='AND'){var a=ev(n.l);
        if(L==='js'||L==='py'){return truthy(a)?ev(n.r):a;}
        if(!truthy(a))return 0n;return truthy(ev(n.r))?1n:0n;}
      if(op==='||'&&L!=='sql'||op==='or'||op==='OR'){var a2=ev(n.l);
        if(L==='js'||L==='py'){return truthy(a2)?a2:ev(n.r);}
        if(truthy(a2))return 1n;return truthy(ev(n.r))?1n:0n;}
      var a3=ev(n.l),b3=ev(n.r);
      switch(op){
        case '+':return chk(a3+b3);
        case '-':return chk(a3-b3);
        case '*':return chk(a3*b3);
        case '||':return BigInt(String(a3)+String(b3)); // SQLite concat (text, then numeric)
        case '**':if(b3<0n)bad('negative exponent gives a fraction');if(b3>4096n){ub=true;return 0n;}return chk(a3**b3);
        case '<':case '<=':case '>':case '>=':case '==':case '!=':case '=':case '<>':return cmp(op,a3,b3)?1n:0n;
        case '&':return L==='js'?I32(I32(a3)&I32(b3)):a3&b3;
        case '|':return L==='js'?I32(I32(a3)|I32(b3)):a3|b3;
        case '^':return L==='js'?I32(I32(a3)^I32(b3)):a3^b3;
        case '<<':case '>>':return shift(op,a3,b3);
        default:bad('operator '+op+' is not evaluated here (division, modulo)');}
    }
    function shift(op,a,b){
      if(L==='js'){var c=b&31n;var x=I32(a);return op==='<<'?I32(x<<c):x>>c;}
      if(L==='sql'){var left=op==='<<';if(b<0n){left=!left;b=-b;}if(b>=64n)return left?0n:(a<0n?-1n:0n);return left?BigInt.asIntN(64,a<<b):a>>b;}
      if(L==='py'){if(b<0n)bad('negative shift count');if(b>4096n){ub=true;return 0n;}return op==='<<'?a<<b:a>>b;}
      // C
      if(b<0n||b>=32n){ub=true;return 0n;}
      if(op==='<<'){if(a<0n)ub=true;return chk(a<<b);}
      return a>>b;}
    try{var v=ev(n);return {v:v,ub:ub};}catch(e){if(e.evalErr)return {v:null,err:e.message};throw e;}
  }
  function analyse(src,L){
    try{var tree=parse(src,L);}catch(e){return {ok:false,error:e.message};}
    var out={ok:true,tree:tree,text:showFull(tree)};if(tree.commented)out.commented=true;
    var vars=false;(function w(n){if(n.t==='id')vars=true;['e','l','r'].forEach(function(k){if(n[k])w(n[k]);});if(n.items)n.items.forEach(w);})(tree);
    if(!vars){var r=evalTree(tree,L);if(r.v!==null){out.value=r.v.toString();if(r.ub)out.ub=true;}else out.evalNote=r.err;}
    return out;}
  var api={LANGS:LANGS,analyse:analyse,parse:parse};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParenWhy=api;
})(typeof window!=='undefined'?window:globalThis);
