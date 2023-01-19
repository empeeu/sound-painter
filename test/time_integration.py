import numpy as np

dt = 0.1
dt2 = dt * dt

t = np.arange(0, 1 + dt / 2, dt)

x = t ** 2
x2 = x.copy()
x2[5:] = 0
N = t.size

for i in range(5, N):
  timeParts = (104.0 * x2[i-1] - 114.0 * x2[i-2] + 56.0 * x2[i-3] - 11.0 * x2[i-4]) / 35.0
  x2[i] = timeParts + 12.0 * dt2  / 35.0 * 2.0

