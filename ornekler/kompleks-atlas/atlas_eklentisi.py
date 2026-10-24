"""Resmi Dizge @işlev genişleme noktası; upstream dosyalarını değiştirmez."""
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import dizge_cekirdek as çekirdek

def kaydet(kök, js, roller=None):
    def decorate(fn):
        çekirdek.işlev(kök, roller)(fn)
        setattr(çekirdek, fn.__name__, fn)
        JS_OPERATIONS[kök] = js
        return fn
    return decorate

JS_OPERATIONS = {}
@kaydet('kompleks_düzlem', 'grid', {})
def kompleks_düzlem(yarıçap=2, çözünürlük=96):
    t=np.linspace(-yarıçap,yarıçap,çözünürlük+1)
    return t[None,:] + 1j*t[:,None]
@kaydet('kareyüzey', 'square')
def kareyüzey(veri): return np.asarray(veri,dtype=complex)**2
@kaydet('küpyüzey', 'cubic')
def küpyüzey(veri): return np.asarray(veri,dtype=complex)**3-1
@kaydet('üstelyüzey', 'exp')
def üstelyüzey(veri): return np.exp(np.asarray(veri,dtype=complex))
@kaydet('sinüsyüzey', 'sin')
def sinüsyüzey(veri): return np.sin(np.asarray(veri,dtype=complex))
@kaydet('möbiyusyüzey', 'mobius')
def möbiyusyüzey(veri):
    z=np.asarray(veri,dtype=complex)
    with np.errstate(divide='ignore',invalid='ignore'): return (z-1)/(z+1)
@kaydet('tersyüzey', 'reciprocal')
def tersyüzey(veri):
    with np.errstate(divide='ignore',invalid='ignore'): return 1/np.asarray(veri,dtype=complex)
@kaydet('genlik', 'abs')
def genlik(veri): return np.abs(veri)
@kaydet('açı', 'phase')
def açı(veri): return np.angle(veri)
@kaydet('gerçel', 're')
def gerçel(veri): return np.real(veri)
@kaydet('sanal', 'im')
def sanal(veri): return np.imag(veri)
@kaydet('logyükseklik', 'log1p')
def logyükseklik(veri): return np.log1p(veri)
