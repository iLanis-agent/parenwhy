# usage: oracle.py <seed> <n> <out.jsonl>. Generates integer expressions per language and records what the real interpreter prints.
import random, sys, json, subprocess, sqlite3, tempfile, os
seed=int(sys.argv[1]); N=int(sys.argv[2]); random.seed(seed)
ARITH=['+','-','*','<<','>>','&','|','<','<=','>','>=','==','!=']
OPS={'c':ARITH+['^','&&','||'],'js':ARITH+['^','&&','||','**'],'py':ARITH+['^','and','or','**'],'sql':ARITH+['AND','OR','=','<>']}
UN={'c':['-','~','!','+'],'js':['-','~','!','+'],'py':['-','~','not ','+'],'sql':['-','~','NOT ','+']}
def gen(L,d):
    r=random.random()
    if d==0 or r<.25: return str(random.randint(0,5))
    if r<.35: return random.choice(UN[L])+gen(L,d-1)
    if r<.45: return '('+gen(L,d-1)+')'
    op=random.choice(OPS[L]); sp=' ' if (op.isalpha()) else random.choice(['',' '])
    if op.isalpha(): sp=' '
    return gen(L,d-1)+sp+op+sp+gen(L,d-1)
cases={L:[gen(L,random.randint(1,4)) for _ in range(N)] for L in OPS}
for L in ('c','js'): cases[L]=[__import__('re').sub(r'([+-])(?=\1)',r'\1 ',x) for x in cases[L]]
out=open(sys.argv[3],'w')
def emit(L,s,v):
    out.write(json.dumps({'l':L,'s':s,'v':v})+'\n')
import signal
def _h(a,b): raise TimeoutError()
signal.signal(signal.SIGALRM,_h)
# python
for s in cases['py']:
    try:
        signal.alarm(1)
        v=eval(s,{'__builtins__':{}})
        signal.alarm(0)
        if isinstance(v,bool): v=int(v)
        emit('py',s,str(v) if isinstance(v,int) else None)
    except Exception: emit('py',s,None)
# sqlite
db=sqlite3.connect(':memory:')
for s in cases['sql']:
    try:
        r=db.execute('SELECT '+s).fetchone()[0]
        emit('sql',s,str(r) if isinstance(r,int) else None)
    except Exception: emit('sql',s,None)
# node
js=cases['js']
open('/tmp/_po_js.json','w').write(json.dumps(js))
res=subprocess.run(['node','-e','''var a=JSON.parse(require("fs").readFileSync("/tmp/_po_js.json"));var o=a.map(function(s){try{var v=new Function("return ("+s+")")();return typeof v==="boolean"?String(Number(v)):(typeof v==="number"&&Number.isInteger(v)&&Math.abs(v)<9e15?String(v):null)}catch(e){return null}});console.log(JSON.stringify(o))'''],capture_output=True,text=True)
for s,v in zip(js,json.loads(res.stdout)): emit('js',s,v)
# C
c=cases['c']
src='#include <stdio.h>\nint main(void){\n'+''.join('printf("%%d\\n",(int)(%s));\n'%s for s in c)+'return 0;}\n'
d=tempfile.mkdtemp(); open(d+'/a.c','w').write(src)
cp=subprocess.run(['gcc','-w','-O0','-o',d+'/a',d+'/a.c'],capture_output=True,text=True)
if cp.returncode: print('gcc failed',cp.stderr[:300]); sys.exit(1)
vals=subprocess.run([d+'/a'],capture_output=True,text=True).stdout.split('\n')[:-1]
for s,v in zip(c,vals): emit('c',s,v)
