# Goal here is to compute the finite difference schemes to get the order accuracy we want
# The main reason I'm not using an online calculator, is none of them seem to give the
# leading order error term... which I do want to know!

# f(x + h) = Sum_i=0^i=\infty h^i / i! f(i)(x)
#          = h^0/0!f(x) + h/1!f'(x) + h^2/2!f''(x) + ...

import numpy as np

h = [-1, 0, 1]
order = 2

def finite_difference_coefficients(h, order, N=4):
    h = np.array(h)
    factorials = np.array([1 / np.math.factorial(i) for i in range(h.size + N)])
    H = np.stack([h ** i for i in range(h.size + N)], axis=1)
    A = H * factorials[None, :]

    # A * [f(x), f'(x), f''(x), ...] = [f(x + h[0]), f(x + h[1]), f(x + h[2]), ...]
    # A * Df = f(x + h)
    # Re arrange the equation to get the column we want on the LHS
    # Df = A^{-1} f(x+h)
    Ainv = np.linalg.inv(A[:h.size, :h.size])

    coeffs = Ainv[order]
    trunc = (Ainv @ A)[order,order+1:]
    I = np.argmax(np.abs(trunc))
    truncation_error = (trunc[I], I + 1)

    return coeffs, truncation_error

