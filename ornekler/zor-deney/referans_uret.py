"""Uygulama JS kodunu çağırmadan analitik/cmath ve NumPy referansları."""
from pathlib import Path
import cmath, json, numpy as np
root=Path(__file__).parent
formulas=[('z^3-1',lambda z:z**3-1,lambda z:3*z*z),('(z-1)/(z+1)',lambda z:(z-1)/(z+1),lambda z:2/(z+1)**2),('exp(z)',cmath.exp,cmath.exp),('sin(z)',cmath.sin,cmath.cos),('cos(z)',cmath.cos,lambda z:-cmath.sin(z)),('log(z)',cmath.log,lambda z:1/z),('sqrt(z)',cmath.sqrt,lambda z:.5/cmath.sqrt(z)),('z^-2',lambda z:z**-2,lambda z:-2/z**3),('exp(z)*sin(z)',lambda z:cmath.exp(z)*cmath.sin(z),lambda z:cmath.exp(z)*(cmath.sin(z)+cmath.cos(z))),('-z^2+2*z-3',lambda z:-z*z+2*z-3,lambda z:-2*z+2)]
derivatives=[]
for formula,f,d in formulas:
 for x,y in [(.3,.7),(-.7,.2),(1.2,-.4),(.5,-.9),(2,.1)]:
  z=complex(x,y);v=f(z);dv=d(z);derivatives.append(dict(formula=formula,z=[x,y],v=[v.real,v.imag],d=[dv.real,dv.imag]))
p=np.array([[-.7,.2,.1],[.8,-.1,.3],[.1,.9,-.6]],dtype=float)
v=np.array([[.1,.04,-.07],[-.03,.02,.06],[.02,-.05,.03]])
m=np.array([.7,1.1,.4]);dt=.003;soft=.03
p0=p.copy();v0=v.copy()
def acceleration(p):
 delta=p[None,:,:]-p[:,None,:]
 inv=(np.sum(delta**2,axis=2)+soft**2)**(-1.5)
 np.fill_diagonal(inv,0)
 return np.sum(delta*inv[:,:,None]*m[None,:,None],axis=1)
for _ in range(100):
 v+=.5*dt*acceleration(p);p+=dt*v;v+=.5*dt*acceleration(p)
gravity=dict(p0=p0.ravel().tolist(),v0=v0.ravel().tolist(),m=m.tolist(),p=p.ravel().tolist(),v=v.ravel().tolist(),steps=100,dt=dt,soft=soft)
n=16;L=12;dx=L/n;dt=.01;x=np.arange(n)*dx-L/2;X,Y=np.meshgrid(x,x)
psi=np.exp(-((X+2)**2+Y**2)/(2*.7**2))*np.exp(2j*X)
psi/=np.sqrt(np.sum(abs(psi)**2)*dx**2)
V=.05*(X**2+Y**2);k=np.fft.fftfreq(n,d=dx)*2*np.pi;KX,KY=np.meshgrid(k,k)
R=np.exp(-.5j*V*dt);T=np.exp(-.5j*(KX**2+KY**2)*dt)
for _ in range(25):psi=R*np.fft.ifft2(T*np.fft.fft2(R*psi))
quantum=dict(n=n,kind='harmonic',dt=dt,steps=25,re=psi.real.ravel().tolist(),im=psi.imag.ravel().tolist(),norm=float(np.sum(abs(psi)**2)*dx**2))
n=8;a=np.arange(n*n);data=np.sin(a*.37)+1j*np.cos(a*.19);ft=np.fft.fft2(data.reshape(n,n))
fft=dict(n=n,re=data.real.tolist(),im=data.imag.tolist(),outRe=ft.real.ravel().tolist(),outIm=ft.imag.ravel().tolist())
reference=dict(derivatives=derivatives,gravity=gravity,quantum=quantum,fft=fft,numpy=np.__version__,source='Bağımsız cmath analitik türevler ve NumPy FFT/vektörel kuvvet')
(root/'referans.json').write_text(json.dumps(reference,ensure_ascii=False,indent=2),encoding='utf-8')
print('Referanslar:',len(derivatives),'f/türev, 3 cisim×100 adım, FFT 8×8, dalga 16×16×25')
