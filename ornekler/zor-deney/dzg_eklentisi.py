"""Resmi @işlev kayıtları. Python NumPy örnekleri JS aşamalarının sözleşmesini izler."""
from pathlib import Path
import sys, numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
import dizge_cekirdek as core
OPS={}
def register(root,js,roles=None):
 def dec(fn):
  core.işlev(root,roles,saf=False)(fn);setattr(core,fn.__name__,fn);OPS[root]=js;return fn
 return dec
@register('newtonveri','newtonInput',{})
def newtonveri():return dict(z=.5+.2j,iteration=0)
@register('türevhesap','evaluate')
def türevhesap(veri):
 z=veri['z'];return dict(veri,v=z**3-1,d=3*z*z)
@register('newtonoran','correction')
def newtonoran(veri):return dict(veri,step=veri['v']/veri['d'])
@register('newtonadım','advance')
def newtonadım(veri):return dict(veri,z=veri['z']-veri['step'],iteration=veri['iteration']+1)
@register('gökveri','gravityInput',{})
def gökveri():return dict(n=3,p=np.array([[-.7,.2,.1],[.8,-.1,.3],[.1,.9,-.6]]),v=np.array([[.1,.04,-.07],[-.03,.02,.06],[.02,-.05,.03]]),m=np.array([.7,1.1,.4]),dt=.003,soft=.03,t=0)
@register('çekim','force')
def çekim(veri):
 d=veri['p'][None,:,:]-veri['p'][:,None,:];inv=(np.sum(d*d,axis=2)+veri['soft']**2)**(-1.5);np.fill_diagonal(inv,0)
 a=np.sum(d*inv[:,:,None]*veri['m'][None,:,None],axis=1);return dict(veri,a=a)
@register('yarımtekme','kick')
def yarımtekme(veri):return dict(veri,v=veri['v']+.5*veri['dt']*veri['a'])
@register('sürükleme','drift')
def sürükleme(veri):return dict(veri,p=veri['p']+veri['dt']*veri['v'],t=veri['t']+veri['dt'])
@register('dalgaveri','quantumInput',{})
def dalgaveri():
 n=16;L=12;dx=L/n;x=np.arange(n)*dx-L/2;X,Y=np.meshgrid(x,x);psi=np.exp(-((X+2)**2+Y**2)/(2*.7**2))*np.exp(2j*X);psi/=np.sqrt(np.sum(abs(psi)**2)*dx**2)
 return dict(n=n,L=L,dx=dx,psi=psi,V=.05*(X*X+Y*Y),dt=.01,t=0)
@register('potansiyelfaz','potential')
def potansiyelfaz(veri):return dict(veri,psi=veri['psi']*np.exp(-.5j*veri['V']*veri['dt']),t=veri['t']+.5*veri['dt'])
@register('ileridönüşüm','forward')
def ileridönüşüm(veri):return dict(veri,psi=np.fft.fft2(veri['psi']))
@register('kinetikfaz','kinetic')
def kinetikfaz(veri):
 k=np.fft.fftfreq(veri['n'],d=veri['dx'])*2*np.pi;X,Y=np.meshgrid(k,k)
 return dict(veri,psi=veri['psi']*np.exp(-.5j*(X*X+Y*Y)*veri['dt']))
@register('tersdönüşüm','inverse')
def tersdönüşüm(veri):return dict(veri,psi=np.fft.ifft2(veri['psi']))
