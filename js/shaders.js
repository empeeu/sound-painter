// Setup
try {
    if (sndptr === undefined){
        console.log("shader.js found `sndptr` was already defined.");
    }
} catch {
    console.log("shader.js defining `sndptr`.");

    sndptr = {};
}

console.log("Loading Shaders...");

// Define the shaders
// vertex
sndptr["vertexShader"] = `
varying vec2 vUv;
void main()	{
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;


//////////////////////////////////////////////////////////////////////////////////////
// Initialization shader for zeroing out the pressure 
//////////////////////////////////////////////////////////////////////////////////////

sndptr["initFragmentShader"] = `
void main()	{
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
`;


//////////////////////////////////////////////////////////////////////////////////////
// Shader that interprets the pressure and colors it
//////////////////////////////////////////////////////////////////////////////////////

sndptr["colorFragmentShader"] = `
varying vec2 vUv;
uniform sampler2D pI;
vec3 HSVtoRGB(in vec3 HSV)
{
    float H   = HSV.x;
    float R   = abs(H * 6.0 - 3.0) - 1.0;
    float G   = 2.0 - abs(H * 6.0 - 2.0);
    float B   = 2.0 - abs(H * 6.0 - 4.0);
    vec3  RGB = clamp( vec3(R,G,B), 0.0, 1.0 );
    return ((RGB - 1.0) * HSV.y + 1.0) * HSV.z;
}
void main()	{
  vec4 p = texture2D(pI, vUv);
  float hue = p.x / p.y;
  float sat = sqrt(p.z * p.z + p.w * p.w);
  float val = 0.5 + (p.y) / 2.0;
  vec3 hsv = vec3(hue, sat, val);
  vec3 prgb = HSVtoRGB(hsv);

  //gl_FragColor = vec4(p, p*p, sin(p * 50.0), 1.0);
  //gl_FragColor = vec4(p.x / 2.0 + 0.5, p.y / 2.0 + 0.5, p.z / 2.0 + 0.5, 1.0);
  gl_FragColor = vec4(prgb, 1.0);
  //gl_FragColor = vec4(p.z / 2.0 + 0.5, p.w / 2.0 + 0.5, 0.5, 1.0);
}
`;


//////////////////////////////////////////////////////////////////////////////////////
// Main pressure shader
//////////////////////////////////////////////////////////////////////////////////////

sndptr["pressureFragmentShader"] = `
/*
Main equation on the interior
d^2(p)/dt^2 = c^2 nabla^2 (p) + df/dt

# consider scaling....
p = Pa == N / m^2 == kg /(s^2 m)
c_air = 343 m/s
d^2(p)/dt^2 = kg / (s^4 m)
c^2 nabla ^2 (p) = m^2/s^2 kg / (s^2 m) / m^2 =  kg / (s^4 m)  
check out -- now choose non-dimensional groups
We want p to be Order 1, so let p* = p/P
Also, choose x* = x / L, and t* = t / T
T^2 / P * d^2(p*)/dt^2 = c^2 / P * L^2 nabla^2 (p*)
d^2(p*)/dt^2 = c^2 * L^2 / T^2 nabla^2 (p*)
Let C = L/T = 343 to make c == 0
To RE-Dimensionalize: p = p* * P, t = t* * T, x = x* * C * T
                  OR: p = p* * P, t = t* * L / C, x = x* * L

let q = dp/dt - f(t)

dq / dt = c^2 nabla^2 (p)
dp / dt = q + f(t)  # source term

q(t) = q(t-1) + dt * G
p(t) = p(t-1) + dt (q + f(t))
q = (p(t) - p(t-1)) / dt - f(t)
(p(t) - p(t-1)) / dt - f(t) = (p(t-1) - p(t-2)) / dt - f(t-1) + dt G
p(t) = 2p(t-1) - p(t-2) + dt (f(t) - f(t-1)) + dt2G

[p(t+1) - 2p(t) + p(t-1)] / dt^2 = c^2 [p(x+1) - 2p(x) + p(x-1)] / dx^2 
                                 + c^2 [p(y+1) - 2p(y) + p(y-1)] / dy^2 

p(t+1) = 2p(t) - p(t-1) + dt^2c^2 [p(x+1) - 2p(x) + p(x-1)] / dx^2 
                        + dt^2c^2 [p(y+1) - 2p(y) + p(y-1)] / dy^2 

Source term
p(t+1) - p(t) = f(t+1) - f(t)
p(t+1) = p(t) + f(t+1) - f(t)

Open Boundary Conditions:
dp/dt = +- c dp/dn
p(t + 1) = p(t) +-c dt /dn (p(n) - p(n-1))
* or rearranging using a "ghost" node (outside the texture)
p(n-1) = p(n) +-dn / (cdt) (p(t+1) - p(t)) 

Damping / Absorption: (always make the change in pressure smaller)
p = \alpha / t
dp / dt = -\alpha / t^2
d2p / dt2 = alpha / t^3 == alpha p^3

or 

dp/dt = \alpha dt/dt  // Really? no negative sign?
dp2/dt2 = \alpha dp/dt


RK-4 th order:
----------------
 y1 = y0 + (⅙) (k1 + 2k2 + 2k3 + k4)

Here,

k1 = hf(x0, y0)
k2 = hf[x0 + (½)h, y0 + (½)k1]
k3 = hf[x0 + (½)h, y0 + (½)k2]
k4 = hf(x0 + h, y0 + k3) 
*/
varying vec2 vUv;
uniform float time;
uniform sampler2D p0I;
uniform sampler2D p1I;
uniform vec4 source;
uniform vec2 dxdy;
uniform vec2 pxpy;
uniform vec2 domain;
uniform float c;
uniform float dt;
uniform sampler2D walls;
uniform float textSourceAmp;
uniform float textSourceFreq;
uniform float absorpCoeff;

vec3 HSVtoRGB(in vec3 HSV)
{
    float H   = HSV.x;
    float R   = abs(H * 6.0 - 3.0) - 1.0;
    float G   = 2.0 - abs(H * 6.0 - 2.0);
    float B   = 2.0 - abs(H * 6.0 - 4.0);
    vec3  RGB = clamp( vec3(R,G,B), 0.0, 1.0 );
    return ((RGB - 1.0) * HSV.y + 1.0) * HSV.z;
}

vec3 RGBtoHSV(in vec3 RGB)
{
    float Epsilon = 1e-7;
    vec4  P   = (RGB.g < RGB.b) ? vec4(RGB.bg, -1.0, 2.0/3.0) : vec4(RGB.gb, 0.0, -1.0/3.0);
    vec4  Q   = (RGB.r < P.x) ? vec4(P.xyw, RGB.r) : vec4(RGB.r, P.yzx);
    float C   = Q.x - min(Q.w, Q.y);
    float H   = abs((Q.w - Q.y) / (6.0 * C + Epsilon) + Q.z);
    vec3  HCV = vec3(H, C, Q.x);
    float S   = HCV.y / (HCV.z + Epsilon);
    return vec3(HCV.x, S, HCV.z);
}

void main()	{
  // A few constants
  float dt2 = dt * dt;
  float dt2c2 = dt2 * c * c;
  float dz = length(dxdy);

  // Get the texture values
  vec4 p0 = texture2D(p0I, vUv);
  vec4 p1 = texture2D(p1I, vUv);
  float offset = 1.0;
  vec4 p1e = texture2D(p1I, vUv + offset * vec2(pxpy.x, 0));
  vec4 p1w = texture2D(p1I, vUv - offset * vec2(pxpy.x, 0));
  vec4 p1n = texture2D(p1I, vUv + offset * vec2(0, pxpy.y));
  vec4 p1s = texture2D(p1I, vUv - offset * vec2(0, pxpy.y));
 
  vec4 wall1e = texture2D(walls, vUv + offset * vec2(pxpy.x, 0));
  vec4 wall1w = texture2D(walls, vUv - offset * vec2(pxpy.x, 0));
  vec4 wall1n = texture2D(walls, vUv + offset * vec2(0, pxpy.y));
  vec4 wall1s = texture2D(walls, vUv - offset * vec2(0, pxpy.y));
  vec3 wallRGB = texture2D(walls, vUv).xyz;
  vec3 wall = RGBtoHSV(wallRGB);

  float d = length(vUv.xy - source.xy);

  float edgeAlpha = 0.0;
  float edgeAlphaVal = 0.04/dt;

  // Handle Boundary conditions
  float onCorner;
  vec2 cornerOffset;
  float onEdge;
  offset = 1.0;
  // East-West edges
  onEdge = float(vUv.x <= pxpy.x * offset);
  cornerOffset.x = -offset * pxpy.x * onEdge;
  onCorner += onEdge;
  edgeAlpha += onEdge * edgeAlphaVal;
  p1w = p1w * (1.0 - onEdge) + onEdge * (p1 - dxdy.x / c / dt * (p1 - p0));
  onEdge = float(vUv.x >= (1.0 - pxpy.x * offset));
  cornerOffset.x = offset * pxpy.x * onEdge;
  onCorner += onEdge;
  edgeAlpha += onEdge * edgeAlphaVal;
  p1e = p1e * (1.0 - onEdge) + onEdge * (p1 - dxdy.x / c / dt * (p1 - p0));

  // North-South edges
  onEdge = float(vUv.y <= pxpy.y * offset);
  cornerOffset.y = -offset * pxpy.y * onEdge;
  onCorner += onEdge;
  edgeAlpha += onEdge * edgeAlphaVal;
  p1s = p1s * (1.0 - onEdge) + onEdge * (p1 - dxdy.y / c / dt * (p1 - p0));
  onEdge = float(vUv.y >= (1.0 - pxpy.y * offset));
  cornerOffset.y = offset * pxpy.y * onEdge;
  onCorner += onEdge;
  edgeAlpha += onEdge * edgeAlphaVal;
  p1n = p1n * (1.0 - onEdge) + onEdge * (p1 - dxdy.y / c / dt * (p1 - p0));

  // Up down "edges"
  vec4 p1up = (p1 - dz / c / dt * (p1 - p0));
  
  ///////// Apply wall boundary conditions
  // Rigid wall
  p1n = p1n * (1.0 - float(wall1n.w > 0.99) * float(wall1n.x < 0.01) * float(wall1n.y < 0.01) * float(wall1n.z < 0.01));
  p1s = p1s * (1.0 - float(wall1s.w > 0.99) * float(wall1s.x < 0.01) * float(wall1s.y < 0.01) * float(wall1s.z < 0.01));
  p1w = p1w * (1.0 - float(wall1w.w > 0.99) * float(wall1w.x < 0.01) * float(wall1w.y < 0.01) * float(wall1w.z < 0.01));
  p1e = p1e * (1.0 - float(wall1e.w > 0.99) * float(wall1e.x < 0.01) * float(wall1e.y < 0.01) * float(wall1e.z < 0.01));

  // Pressure-release wall
  float isPRWall;
  isPRWall = float(wall1n.w > 0.99) * float(wall1n.x > 0.99)* float(wall1n.y > 0.99)* float(wall1n.z > 0.99);
  p1n = p1n * (1.0 - isPRWall) + p1 * isPRWall;
  isPRWall = float(wall1s.w > 0.99) * float(wall1s.x > 0.99)* float(wall1s.y > 0.99)* float(wall1s.z > 0.99);
  p1s = p1s * (1.0 - isPRWall) + p1 * isPRWall;
  isPRWall = float(wall1w.w > 0.99) * float(wall1w.x > 0.99)* float(wall1w.y > 0.99)* float(wall1w.z > 0.99);
  p1w = p1w * (1.0 - isPRWall) + p1 * isPRWall;
  isPRWall = float(wall1e.w > 0.99) * float(wall1e.x > 0.99)* float(wall1e.y > 0.99)* float(wall1e.z > 0.99);
  p1e = p1e * (1.0 - isPRWall) + p1 * isPRWall;


  // Compute the integration of pressures
  vec4 xParts, yParts, zParts;
  float dn;
  if (onCorner >= 2.0){
    dn = length(dxdy);
    p1n = texture2D(p1I, vUv - cornerOffset);
    p1s = p1 - dn / c / dt * (p1 - p0);
    xParts = vec4(0.0,0.0,0.0,0.0);
    yParts = (p1n - 2.0 * p1 + p1s) / (dn * dn);
  } else {
    xParts = (p1e - 2.0 * p1 + p1w) / (dxdy.x * dxdy.x);
    yParts = (p1n - 2.0 * p1 + p1s) / (dxdy.y * dxdy.y);
  }

  vec4 timeParts = 2.0 * p1 - p0;
  float f = textSourceFreq * (pow(2.0, source.w) - 1.0);
  float mouseSourceParts = float(d < (length(dxdy) * 1.0)) * float(source.z > 0.0) * sin(6.283185 * time * f);
  float mouseSourceParts2 =  textSourceAmp * source.z * float(d < (length(dxdy) * 1.0)) * cos(6.283185 * time * f);
  // use the transparency to keep track of the amplitude
  vec4 sourceParts = vec4(source.w * mouseSourceParts, mouseSourceParts, source.z * textSourceAmp * mouseSourceParts, mouseSourceParts2);
  
  f = textSourceFreq * (pow(2.0, wall.x) - 1.0);
  sourceParts.y += float(wall.y > 0.05) * sin(6.283185 * (time * f + wall.z));
  sourceParts.x += wall.x * sourceParts.y;
  sourceParts.z += wall.y * textSourceAmp * sourceParts.y;
  sourceParts.w += wall.y * textSourceAmp * dt2 * float(wall.y > 0.05) * cos(6.283185 * (time * f + wall.z));
  vec4 absorp = dt * edgeAlpha * (p1 - p0) + absorpCoeff * dt2c2 * (p1up - p1) / (dz * dz);
  vec4 p = timeParts + dt2c2 * (xParts + yParts + zParts) + absorp;
  p = p * float(sourceParts.y == 0.0) + sourceParts * float(sourceParts.y != 0.0); 

  gl_FragColor = p;
}
`;

console.log("... done loading shaders.");