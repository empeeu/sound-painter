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
// Shader that interprets the pressure and colors it based on amplitude
//////////////////////////////////////////////////////////////////////////////////////

sndptr["colorFragmentShaderAmplitude"] = `
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
  float hue = sqrt(abs(p.w));
  float sat = sqrt(abs(p.w));
  float val = (0.5 + min(1.0, max(-1.0, p.z)) * 0.25);
  vec3 hsv = vec3(hue, sat, val);
  vec3 prgb = HSVtoRGB(hsv);

  gl_FragColor = vec4(prgb, 1.0);
  // gl_FragColor = vec4(hue, 0.0, 0.0, 1.0);
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
uniform int sourceType;
uniform int BCType;

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
  sourceParts.w += wall.y * textSourceAmp * float(wall.y > 0.05) * cos(6.283185 * (time * f + wall.z));
  vec4 absorp = dt * edgeAlpha * (p1 - p0) + absorpCoeff * dt2c2 * (p1up - p1) / (dz * dz);
  vec4 p = timeParts + dt2c2 * (xParts + yParts + zParts) + absorp;
  p = p * float(sourceParts.y == 0.0) + sourceParts * float(sourceParts.y != 0.0); 

  gl_FragColor = p;
}
`;


sndptr["pressureFragmentShader4thOrder"] = `
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

# interior
[35p(t+1) -104p(t) +114p(t-1) -56p(t-2) +11p(t-3)] / (12dt^2) = 
                                 + c^2 [-p(x+2) + 16p(x+1) - 30p(x) + 16p(x-1) - p(x-2)] / (12 dx^2) 
                                 + c^2 [-p(y+2) + 16p(y+1) - 30p(y) + 16p(y-1) - p(y-2)] / (12 dy^2) 

35p(t+1) = 104p(t) - 114p(t-1) +56p(t-2) - 11p(t-2)
           + 12dt^2c^2 [-p(x+2) + 16p(x+1) - 30p(x) + 16p(x-1) - p(x-2)] / (12dx^2) 
           + 12dt^2c^2 [-p(y+2) + 16p(y+1) - 30p(y) + 16p(y-1) - p(y-2)] / (12dy^2 )

For the node on the very edge of the texture, we modify the central difference scheme, and instead use:
35p(t+1) = 104p(t) - 114p(t-1) +56p(t-2) - 11p(t-2)
           + 12dt^2c^2 [10p(x+1) - 15p(x) - 4p(x-1) + 14p(x-2) - 6p(x-3) + 1p(x-4)] / (12dx^2) 
           + 12dt^2c^2 [10p(y+1) - 15p(y) - 4p(y-1) + 14p(y-2) - 6p(y-3) + 1p(y-4)] / (12dy^2 ) 

Source term, "soft" form:
p(t+1) - p(t) = f(t+1) - f(t)
p(t+1) = p(t) + f(t+1) - f(t)

Open Boundary Conditions:
dp/dt = +- c dp/dn
[11p(t) - 18p(t-1) + 9p(t-2)-2p(t-3)] / (6dt) =  +-c (3p(n+1) + 10p(n) - 18 p(n-1) + 6p(n-2) - p(n-3)) / (12 dn)
* or rearranging using a "ghost" node (outside the texture, i.e. at n + 1)
p(n+1) = [22p(t) - 36p(t-1) + 18p(t-2)-4p(t-3)] / (3 c dt) * dn - [10p(n) + 18p(n-1) - 6p(n-2) + p(n-3)] / 3
p(n-1) = [22p(t) - 36p(t-1) + 18p(t-2)-4p(t-3)] / (3 c dt) * dn + [10p(n) + 18p(n+1) - 6p(n+2) + p(n+3)] / 3

Free surface boundary conditions
dp/dn = 0 = (3p(n+1) + 10 p - 18 p(n-1) + 6 p(n-2) - 1 p(n-3)) / (12 dx)
p(n+1) = (-10p + 18p(n-1) - 6p(n-2) + p(n-3)) / 3


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
uniform vec4 source;  // source.xy is xy location of mouse. source.z = amplitude. source.w = frequency
uniform vec2 dxdy;
uniform vec2 pxpy;  // size of pixel in x and y directions, for a 1x1 domain
uniform vec2 domain;
uniform float c;
uniform float dt;
uniform sampler2D walls;
uniform float textSourceAmp;
uniform float textSourceFreq;
uniform float absorpCoeff;
uniform int sourceType;
uniform int BCType;

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

float stencilCentralOrd2Acc2(float pm1, float p, float pp1, float dx2){
  return (pm1 - 2.0*p + pp1) / dx2;
}

float stencilCentralOrd2Acc4(float pm2, float pm1, float p, float pp1, float pp2, float dx2){
  return (-pm2 + 16.0 * pm1 - 30.0*p + 16.0 * pp1 - pp2) / (dx2 * 12.0);
}

float stencilSkewOrd2Acc5(float pm4, float pm3, float pm2, float pm1, float p, float pp1, float dx2){
  return (pm4 - 6.0*pm3 + 14.0*pm2 - 4.0*pm1 - 15.0*p + 10.0 *pp1) / (dx2 * 12.0);
}

float computeBCsAcc4(int BCType, vec4 p, vec4 pp1, vec4 pp2, vec4 pp3, vec4 pp4, float dn, float dt, float c, float sgn) {
  float pbc = 0.0;
  if (BCType == 0) { // Open boundary condition
    return (22.0 * p.w - 36.0 * p.z + 18.0 * p.y - 4.0 * p.x) / (3.0 * c * dt) * dn + sgn * (10.0 * p.w + 18.0 * pp1.w - 6.0 * pp2.w + pp3.w) / 3.0;
  }
  if (BCType == 1) { // Rigid Wall
    return 0.0;
  }
  if (BCType == 2) {  // Free surface
    return (-10.0 * p.w + 18.0 * pp1.w - 6.0 * pp2.w + pp3.w) / 3.0;
  }
  if (BCType == 3) { // Periodic
    return pp1.w; // up to the caller to pass the correct value here
  }
}

float computeBCsAcc1(int BCType, vec4 p, vec4 pp1, float dn, float dt, float c, float sgn) {
  float pbc = 0.0;
  if (BCType == 0) { // Open boundary condition
    return (p.w - p.z) / (c * dt) * dn + sgn * p.w;
  }
  if (BCType == 1) { // Rigid Wall
    return 0.0;
  }
  if (BCType == 2) {  // Free surface
    return p.w;
  }
  if (BCType == 3) { // Periodic
    return pp1.w; // up to the caller to pass the correct value here
  }
}

void main()	{
  // A few constants
  float dt2 = dt * dt;
  float dt2c2 = dt2 * c * c;
  float dx = dxdy.x;
  float dy = dxdy.y;
  float dz = length(dxdy);
  float pi = 6.283185;
  vec4 p = vec4(0.0, 0.0, 0.0, 0.0);  // The output pressure
  float offset = 1.0;

  // Prepare the time levels from the next iteration
  vec4 p0 = texture2D(p0I, vUv);
  p.x = p0.y;
  p.y = p0.z;
  p.z = p0.w;
  p.w = 0.0;

  // Need this for bc and source terms
  vec3 wallRGB = texture2D(walls, vUv).xyz;
  vec3 wall = RGBtoHSV(wallRGB);

  ////// Compute the source terms
  //// Mouse Source
  // Distance from mouse source to this pixel
  float d = length(vUv.xy - source.xy);  // Distance from this pixel to the mouse

  float f = textSourceFreq * (pow(2.0, source.w) - 1.0);
  float mouseSourceParts = textSourceAmp * source.z * sin(pi * time * f);  // Compute the source value
  mouseSourceParts = mouseSourceParts * float(d < (dz * 1.0)) * float(source.z > 0.0);  // Zero it out, if needed
  
  //// Texture source
  f = textSourceFreq * (pow(2.0, wall.x) - 1.0);
  float sourceParts = wall.y * textSourceAmp * sin(pi * (time * f + wall.z));  // Compute the source value
  sourceParts = float(wall.y > 0.05) * sourceParts;  // Zero it out if needed

  //// Combine the two
  sourceParts += mouseSourceParts;
  
  if (sourceParts > 0.0){
    if (sourceType == 0) {  // Hard source
      p.w = sourceParts;  // value of pressure equal to the source at this point
      gl_FragColor = p;
      return;
    }
    if (sourceType == 1) {  // Soft source
      // substract out the source value from the previous timestep
      sourceParts -= wall.y * textSourceAmp * sin(pi * ((time - dt) * f + wall.z));
      sourceParts -= textSourceAmp * source.z * sin(pi * (time - dt) * f);
    }
  }

  ////// Compute the time parts
  float timeParts = (104.0 * p0.w - 114.0 * p0.z + 56.0 * p0.y - 11.0 * p0.x) / 35.0;

  ////////// Compute the spatial derivatives //////////////

  ////// Figure out which boundaries we're on and the type of boundary
  //// Start with the edges
  float onCorner;
  vec2 cornerOffset = vec2(0, 0);  // When computing the open BC, need to grab value from diagonal
  // Each of the float values below record the type of boundary:
  //   1: open BC
  //   2: ridgid boundary (dp/dn = 0)
  //   3: free-surface (p=0)
  //   4: periodic
  int edgeBCType = int(BCType + 1);  // BCType is globally specified and passed to shader
  int onWestEdge;  // Tests for pixels on the edge of the texture
  int onEastEdge;  
  int onSouthEdge;  
  int onNorthEdge;  
  int nearWestEdge;  // Tests for pixels right next to the edge of the texture
                   // This is needed to deal with the wide 4th order stencil
  int nearEastEdge;
  int nearSouthEdge;
  int nearNorthEdge;

  float edgeAlpha = 0.0;  // This is for extra damping at the edges
  float edgeAlphaVal = 0.04/dt;  // This is the amount of damping at the edges

  //// East-West edges
  // West Edge
  onWestEdge = int(vUv.x <= pxpy.x * offset) * edgeBCType;
  nearWestEdge = int(vUv.x <= (pxpy.x * offset * 2.0)) * edgeBCType;
  // cornerOffset.x = -offset * pxpy.x * onWestEdge;  // This will only be active if on the edge
  // East Edge
  onEastEdge = int(vUv.x >= (1.0 - pxpy.x * offset)) * edgeBCType;
  nearEastEdge = int(vUv.x >= (1.0 - pxpy.x * offset * 2.0)) * edgeBCType;
  // cornerOffset.x = offset * pxpy.x * onEastEdge;

  //// North-South edges
  // South Edge (assuming bottom of texture is coordinate origin -- not true for all systems)
  onSouthEdge = int(vUv.y <= pxpy.y * offset) * edgeBCType;
  nearSouthEdge = int(vUv.y <= pxpy.y * offset * 2.0) * edgeBCType;
  // cornerOffset.y = -offset * pxpy.y * onSouthEdge;
  // North Edge (see assumption above)
  onNorthEdge = int(vUv.y >= (1.0 - pxpy.y * offset)) * edgeBCType;
  nearNorthEdge = int(vUv.y >= (1.0 - pxpy.y * offset * 2.0)) * edgeBCType;
  // cornerOffset.y = offset * pxpy.y * onNorthEdge;
  
  ////// Now do interior boundary conditions
  // Get the type of wall
  int isRidgid;
  int isFree;
  vec4 wall1e = texture2D(walls, vUv + offset * vec2(pxpy.x, 0));
  vec4 wall1ee = texture2D(walls, vUv + 2.0* offset * vec2(pxpy.x, 0));
  vec4 wall1w = texture2D(walls, vUv - offset * vec2(pxpy.x, 0));
  vec4 wall1ww = texture2D(walls, vUv - 2.0 * offset * vec2(pxpy.x, 0));
  vec4 wall1n = texture2D(walls, vUv + offset * vec2(0, pxpy.y));
  vec4 wall1nn = texture2D(walls, vUv + 2.0 * offset * vec2(0, pxpy.y));
  vec4 wall1s = texture2D(walls, vUv - offset * vec2(0, pxpy.y));
  vec4 wall1ss = texture2D(walls, vUv - 2.0 * offset * vec2(0, pxpy.y));
 
  
  //// East-West edges
  // West Edge
  isRidgid = (1 - int(wall1w.w > 0.99) * int(wall1w.x < 0.01) * int(wall1w.y < 0.01) * int(wall1w.z < 0.01));
  isFree = int(wall1w.w > 0.99) * int(wall1w.x > 0.99)* int(wall1w.y > 0.99)* int(wall1w.z > 0.99);
  // if onWestEdge > 0, then the pixel values for wall1w is outside the texture, and we don't want to use them
  onWestEdge += int(onWestEdge == 0) * int(isRidgid * 2 + isFree * 3);
  isRidgid = (1 - int(wall1ww.w > 0.99) * int(wall1ww.x < 0.01) * int(wall1ww.y < 0.01) * int(wall1ww.z < 0.01));
  isFree = int(wall1ww.w > 0.99) * int(wall1ww.x > 0.99)* int(wall1ww.y > 0.99)* int(wall1ww.z > 0.99);
  nearWestEdge += int(nearWestEdge == 0) * (isRidgid * 2 + isFree * 3);
  // East Edge
  isRidgid = (1 - int(wall1e.w > 0.99) * int(wall1e.x < 0.01) * int(wall1e.y < 0.01) * int(wall1e.z < 0.01));
  isFree = int(wall1e.w > 0.99) * int(wall1e.x > 0.99)* int(wall1e.y > 0.99)* int(wall1e.z > 0.99);  // if onWestEdge > 0, then the pixel values for wall1w is outside the texture, and we don't want to use them
  onEastEdge += int(onEastEdge == 0) * (isRidgid * 2 + isFree * 3);
  isRidgid = (1 - int(wall1ee.w > 0.99) * int(wall1ee.x < 0.01) * int(wall1ee.y < 0.01) * int(wall1ee.z < 0.01));
  isFree = int(wall1ee.w > 0.99) * int(wall1ee.x > 0.99)* int(wall1ee.y > 0.99)* int(wall1ee.z > 0.99);
  nearEastEdge += int(nearEastEdge == 0) * (isRidgid * 2 + isFree * 3);

  //// North-South edges
  // South Edge (assuming bottom of texture is coordinate origin -- not true for all systems)
  isRidgid = (1 - int(wall1s.w > 0.99) * int(wall1s.x < 0.01) * int(wall1s.y < 0.01) * int(wall1s.z < 0.01));
  isFree = int(wall1s.w > 0.99) * int(wall1s.x > 0.99)* int(wall1s.y > 0.99)* int(wall1s.z > 0.99);
  onSouthEdge += int(onSouthEdge == 0) * (isRidgid * 2 + isFree * 3);
  isRidgid = (1 - int(wall1ss.w > 0.99) * int(wall1ss.x < 0.01) * int(wall1ss.y < 0.01) * int(wall1ss.z < 0.01));
  isFree = int(wall1ss.w > 0.99) * int(wall1ss.x > 0.99)* int(wall1ss.y > 0.99)* int(wall1ss.z > 0.99);
  nearSouthEdge += int(nearSouthEdge == 0) * (isRidgid * 2 + isFree * 3);
  // North Edge (see assumption above)
  isRidgid = (1 - int(wall1n.w > 0.99) * int(wall1n.x < 0.01) * int(wall1n.y < 0.01) * int(wall1n.z < 0.01));
  isFree = int(wall1n.w > 0.99) * int(wall1n.x > 0.99)* int(wall1n.y > 0.99)* int(wall1n.z > 0.99);
  onNorthEdge += int(onNorthEdge == 0) * (isRidgid * 2 + isFree * 3);
  isRidgid = (1 - int(wall1nn.w > 0.99) * int(wall1nn.x < 0.01) * int(wall1nn.y < 0.01) * int(wall1nn.z < 0.01));
  isFree = int(wall1nn.w > 0.99) * int(wall1nn.x > 0.99)* int(wall1nn.y > 0.99)* int(wall1nn.z > 0.99);
  nearNorthEdge += int(nearNorthEdge == 0) * (isRidgid * 2 + isFree * 3);  

  ////// Finally, compute the values of boundary ghost nodes and apply the appropriate 
  ////// stencils
  float xparts, yparts;
  vec4 pe, pee, peee, peeee, pw, pww, pwww, pwwww;
  vec4 ps, pss, psss, pssss, pn, pnn, pnnn, pnnnn;

  // TODO, think about corners
  //// Do the d2/dx2 derivatives
  if (((onEastEdge > 0) || (nearEastEdge > 0)) && ((onWestEdge > 0) || (nearWestEdge > 0))) {
    // we have to do end order stencil with low order boundary estimation
    // East Edge
    if (onEastEdge == 4){  // Periodic
      pe = texture2D(p0I, vUv * vec2(0, 1));
    }
    if (onEastEdge > 0) {
      pe.w = computeBCsAcc1(onEastEdge - 1, p0, pe, dx, dt, c, 1.0);
    } else {
      pe = texture2D(p0I, vUv + offset * vec2(pxpy.x, 0));
    }
    // West edge
    if (onWestEdge == 4){  // periodic
      pw = texture2D(p0I, vUv * vec2(0, 1) + vec2(1, 0));
    if (onWestEdge > 0) {
      pw.w = computeBCsAcc1(onWestEdge - 1, p0, pw, dx, dt, c, -1.0);
    } else {
      pw = texture2D(p0I, vUv - offset * vec2(pxpy.x, 0));
    }
    xparts = stencilCentralOrd2Acc2(pw, p, pe, dx2);
  } else {
    // We can use higher order numerics
    // In this branch we can't be near both a west and east edge, so either one edge
    // or the other, or none

    //// Grab periodic values
    // East edge
    if (onEastEdge == 4){  // Periodic
      pe = texture2D(p0I, vUv * vec2(0, 1));
      pee =  texture2D(p0I, vUv * vec2(0, 1) + vec2(pxpy.x, 0));
    } else if (nearEastEdge == 4){ // Periodic
          pee =  texture2D(p0I, vUv * vec2(0, 1) + vec2(pxpy.x, 0));
    }
    // West Edge
    if (onWestEdge == 4){  // Periodic
      pw = texture2D(p0I, vUv * vec2(0, 1) + vec2(1, 0));
      pww =  texture2D(p0I, vUv * vec2(0, 1) + vec2(1 - pxpy.x, 0));
    } else if (nearWestEdge == 4) {
      pww =  texture2D(p0I, vUv * vec2(0, 1) + vec2(1 - pxpy.x, 0));
    }
    //// Compute the derivatives
    // Both East and West in big switch statement
    if (onEastEdge > 0){
      // Have to use the skewed stencil
      pw = texture2D(p0I, vUv - offset * vec2(pxpy.x, 0));
      pww = texture2D(p0I, vUv - 2.0 * offset * vec2(pxpy.x, 0));
      pwww = texture2D(p0I, vUv - 3.0 * offset * vec2(pxpy.x, 0));
      pwwww = texture2D(p0I, vUv - 4.0 * offset * vec2(pxpy.x, 0));
      pe.w = computeBCsAcc4(onEastEdge - 1, p, pw, pww, pwww, pwwww, dx, dt, c, 1.0);
      xparts = stencilSkewOrd2Acc5(pwwww, pwww, pww, pw, p, pe, dx2);
    } else if(nearEastEdge) {
      pw = texture2D(p0I, vUv - offset * vec2(pxpy.x, 0));
      pww = texture2D(p0I, vUv - 2.0 * offset * vec2(pxpy.x, 0));
      pwww = texture2D(p0I, vUv - 3.0 * offset * vec2(pxpy.x, 0));
      pe = texture2D(p0I, vUv + offset * vec2(pxpy.x, 0));
      pee.w = computeBCsAcc4(onEastEdge - 1, pe, p, pw, pww, pwww, dx, dt, c, 1.0);
      xparts = stencilCentralOrd2Acc4(pww, pw, p, pe, pee, dx2);
    } else if (onWestEdge > 0){
      // Have to use the skewed stencil
      pe = texture2D(p0I, vUv + offset * vec2(pxpy.x, 0));
      pee = texture2D(p0I, vUv + 2.0 * offset * vec2(pxpy.x, 0));
      peee = texture2D(p0I, vUv + 3.0 * offset * vec2(pxpy.x, 0));
      peeee = texture2D(p0I, vUv + 4.0 * offset * vec2(pxpy.x, 0));
      pw.w = computeBCsAcc4(onWestEdge - 1, p, pe, pee, peee, peeee, dx, dt, c, -1.0);
      xparts = stencilSkewOrd2Acc5(peeee, peee, pee, pe, p, pw, dx2);
    } else if(nearWestEdge > 0) {
      pw = texture2D(p0I, vUv - offset * vec2(pxpy.x, 0));
      pe = texture2D(p0I, vUv + offset * vec2(pxpy.x, 0));
      pee = texture2D(p0I, vUv + 2.0 * offset * vec2(pxpy.x, 0));
      peee = texture2D(p0I, vUv + 3.0 * offset * vec2(pxpy.x, 0));
      pww.w = computeBCsAcc4(onWestEdge - 1, pw, p, pe, pee, peee, dx, dt, c, -1.0);
      xparts = stencilCentralOrd2Acc4(pww, pw, p, pe, pee, dx2);
    } else {
      // Not on any boundary
      pw = texture2D(p0I, vUv - offset * vec2(pxpy.x, 0));
      pww = texture2D(p0I, vUv - 2.0 * offset * vec2(pxpy.x, 0));
      pe = texture2D(p0I, vUv + offset * vec2(pxpy.x, 0));
      pee = texture2D(p0I, vUv + 2.0 * offset * vec2(pxpy.x, 0));
      xparts = stencilCentralOrd2Acc4(pww, pw, p, pe, pee, dx2);
    }
  }
  
  //// Do the d2/dy2 derivatives
  if (((onNorthEdge > 0) | (nearNorthEdge > 0)) & ((onSouthEdge > 0) | (nearSouthEdge > 0))) {
    // we have to do end order stencil with low order boundary estimation
    // North Edge
    if (onNorthEdge == 4){  // Periodic
      pn = texture2D(p0I, vUv * vec2(1, 0));
    }
    if (onNorthEdge > 0) {
      pn.w = computeBCsAcc1(onNorthEdge - 1, p0, pn, dy, dt, c, 1.0);
    } else {
      pn = texture2D(p0I, vUv + offset * vec2(0, pxpy.y));
    }
    // South edge
    if (onSouthEdge == 4){  // periodic
      ps = texture2D(p0I, vUv * vec2(1, 0) + vec2(0, 1));
    if (onSouthEdge) {
      ps.w = computeBCsAcc1(onSouthEdge - 1, p0, ps, dy, dt, c, -1.0);
    } else {
      ps = texture2D(p0I, vUv - offset * vec2(0, pxpy.y));
    }
    yparts = stencilCentralOrd2Acc2(ps, p, pn, dx2);
  } else {
    // We can use higher order numerics
    // In this branch we can't be near both a north and south edge, so either one edge
    // or the other, or none

    //// Grab periodic values
    // North edge
    if (onNorthEdge == 4){  // Periodic
      pn = texture2D(p0I, vUv * vec2(1, 0));
      pnn =  texture2D(p0I, vUv * vec2(1, 0) + vec2(0, pxpy.y));
    } else if (nearNorthEdge == 4){ // Periodic
          pnn =  texture2D(p0I, vUv * vec2(1, 0) + vec2(0, pxpy.y));
    }
    // South Edge
    if (onSouthEdge == 4){  // Periodic
      ps = texture2D(p0I, vUv * vec2(1, 0) + vec2(0, 1));
      pss = texture2D(p0I, vUv * vec2(1, 0) + vec2(0, 1 - pxpy.y));
    } else if (nearSouthEdge == 4) {
      pss =  texture2D(p0I, vUv * vec2(0, 1) + vec2(0, 1 - pxpy.y));
    }
    //// Compute the derivatives
    // Both North and South in big switch statement
    if (onNorthEdge > 0){
      // Have to use the skewed stencil
      ps = texture2D(p0I, vUv - offset * vec2(0, pxpy.y));
      pss = texture2D(p0I, vUv - 2.0 * offset * vec2(0, pxpy.y));
      psss = texture2D(p0I, vUv - 3.0 * offset * vec2(0, pxpy.y));
      pssss = texture2D(p0I, vUv - 4.0 * offset * vec2(0, pxpy.y));
      pn.w = computeBCsAcc4(onNorthEdge - 1, p, ps, pss, psss, pssss, dy, dt, c, 1.0);
      yparts = stencilSkewOrd2Acc5(pssss, psss, pss, ps, p, pn, dx2);
    } else if(nearNorthEdge > 0) {
      ps = texture2D(p0I, vUv - offset * vec2(0, pxpy.y));
      pss = texture2D(p0I, vUv - 2.0 * offset * vec2(0, pxpy.y));
      psss = texture2D(p0I, vUv - 3.0 * offset * vec2(0, pxpy.y));
      pn = texture2D(p0I, vUv + offset * vec2(0, pxpy.y));
      pnn.w = computeBCsAcc4(onNorthEdge - 1, pn, p, ps, pss, psss, dy, dt, c, 1.0);
      yparts = stencilCentralOrd2Acc4(pss, ps, p, pn, pnn, dx2);
    } else if (onSouthEdge > 0){
      // Have to use the skewed stencil
      pn = texture2D(p0I, vUv + offset * vec2(0, pxpy.y));
      pnn = texture2D(p0I, vUv + 2.0 * offset * vec2(0, pxpy.y));
      pnnn = texture2D(p0I, vUv + 3.0 * offset * vec2(0, pxpy.y));
      pnnnn = texture2D(p0I, vUv + 4.0 * offset * vec2(0, pxpy.y));
      ps.w = computeBCsAcc4(onSouthEdge - 1, p, pn, pnn, pnnn, pnnnn, dy, dt, c, -1.0);
      yparts = stencilSkewOrd2Acc5(pnnnn, pnnn, pnn, pn, p, ps, dx2);
    } else if(nearSouthEdge > 0) {
      ps = texture2D(p0I, vUv - offset * vec2(0, pxpy.y));
      pn = texture2D(p0I, vUv + offset * vec2(0, pxpy.y));
      pnn = texture2D(p0I, vUv + 2.0 * offset * vec2(0, pxpy.y));
      pnnn = texture2D(p0I, vUv + 3.0 * offset * vec2(0, pxpy.y));
      pss.w = computeBCsAcc4(onSouthEdge - 1, ps, p, pn, pnn, pnnn, dy, dt, c, -1.0);
      yparts = stencilCentralOrd2Acc4(pss, ps, p, pn, pnn, dx2);
    } else {
      // Not on any boundary
      ps = texture2D(p0I, vUv - offset * vec2(0, pxpy.y));
      pss = texture2D(p0I, vUv - 2.0 * offset * vec2(0, pxpy.y));
      pn = texture2D(p0I, vUv + offset * vec2(0, pxpy.y));
      pnn = texture2D(p0I, vUv + 2.0 * offset * vec2(0, pxpy.y));
      yparts = stencilCentralOrd2Acc4(pww, pw, p, pe, pee, dx2);
    }
  }

  //// Compute absorption
  // Up down "edges"
  vec4 p1up = (p1 - dz / c / dt * (p0.w - p0.z));
  vec4 absorp = dt * edgeAlpha * (p0.w - p0.z) + absorpCoeff * dt2c2 * (p1up - p0.w) / (dz * dz);

  vec4 p.w = timeParts + sourceParts + 12.0 * dt2c2 * (xParts + yParts + zParts) + absorp;

  gl_FragColor = p;
}
`;


console.log("... done loading shaders.");




