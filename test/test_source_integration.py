import numpy as np
import matplotlib.pyplot as plt
# p(t+1) = 2p(t) - p(t-1) + dt^2c^2 [p(x+1) - 2p(x) + p(x-1)] / dx^2 
#                         + dt^2c^2 [p(y+1) - 2p(y) + p(y-1)] / dy^2 

f1 = 2
f2 = 3

t = 0 

p2 = np.zeros(3)
dt = 2/1000
p1 = np.zeros(3)
p2t = []
p1t = []
p1[0] = np.cos(2 * np.pi * f1 * (t))
p1[1] = np.cos(2 * np.pi * f1 * (t + dt))
p2[0] = np.cos(2 * np.pi * f2 * (t))
p2[1] = np.cos(2 * np.pi * f2 * (t + dt))
t = dt*2
for i in range(int(3/dt)):
    # p1[2] = 2 * p1[1] - p1[0] - dt**2 * (2 * np.pi * f1)**2 * np.cos(2 * np.pi * f1 * t) 
    # p2[2] = 2 * p2[1] - p2[0] - dt**2 * (2 * np.pi * f2)**2 * np.cos(2 * np.pi * f2 * t)
    # p1[2] = 2 * p1[1] - p1[0] + np.cos(2 * np.pi * f1 * t) - 2*np.cos(2 * np.pi * f1 * (t - dt)) + np.cos(2 * np.pi * f1 * (t - dt * 2))
    # p2[2] = 2 * p2[1] - p2[0] + np.cos(2 * np.pi * f2 * t) - 2*np.cos(2 * np.pi * f2 * (t - dt)) + np.cos(2 * np.pi * f2 * (t - dt * 2))
    # p1[2] = 2 * p1[1] - p1[0] - dt * 2 * np.pi * f1 * (np.sin(2 * np.pi * f1 * t) - np.sin(2 * np.pi * f1 * (t - dt)))
    # p2[2] = 2 * p2[1] - p2[0] - dt * 2 * np.pi * f2 * (np.sin(2 * np.pi * f2 * t) - np.sin(2 * np.pi * f2 * (t - dt)))
    
    p1[2] = p1[1] - dt * 2 * np.pi * f1 *np.sin(2 * np.pi * f1 * t)
    p2[2] = p2[1] - dt * 2 * np.pi * f2 * np.sin(2 * np.pi * f2 * t)
    # p1[2] = p1[1] + np.cos(2 * np.pi * f1 * t) - np.cos(2 * np.pi * f1 * (t - dt)) 
    # p2[2] = p2[1] + np.cos(2 * np.pi * f2 * t) - np.cos(2 * np.pi * f2 * (t - dt)) 


    p1t.append(p1[2])
    p2t.append(p2[2]) 
    p1[:] = p1[[1,2,0]]
    p2[:] = p2[[1,2,0]]
    t += dt

plt.plot(p1t, label=f"p1({f1})")
plt.plot(p2t, label=f"p2({f2})")
plt.show()