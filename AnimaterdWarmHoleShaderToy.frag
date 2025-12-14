
vec3 aces(vec3 color) {	
    mat3 m1 = mat3(
        0.29719, 0.97600, 1.02840,
        0.35458, 0.30834, 0.13383,
        0.24823, 0.01566, 0.83777
    );
    mat3 m2 = mat3(
        1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
    );
    vec3 v = m1 * color;	 	
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    
    return m2 * (a / b);	
}

mat2 rot(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
const mat3 m3 = mat3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339)*1.93;
float mag2(vec2 p){return dot(p,p);}
float linstep(in float mn, in float mx, in float x){ return clamp((x - mn)/(mx - mn), 0., 1.); }

// Global State Variables
float prm1 = 0.;
vec2 bsMo = vec2(0);

vec2 disp(float t){ return vec2(sin(t*0.22)*1., cos(t*0.175)*1.)*2.; }


vec2 map(vec3 p)
{
    vec3 p2 = p;
    p2.xy -= disp(p.z).xy;
    p.xy *= rot(sin(p.z+iTime)*(0.1 + prm1*0.05) + iTime*0.09);
    
    // cl is the Radial Distance squared, which we emphasize for a tunnel effect
    float cl = mag2(p2.xy); 
    
    float d = 0.;
    p *= .61;
    float z = 1.;
    float trk = 1.;
    float dspAmp = 0.1 + prm1*0.2;
    
    // REDUCED ITERATIONS: Reduced from 5 to 3 for smoother, less lumpy shapes
    for(int i = 0; i < 3; i++) // <<< ADJUSTED HERE
    {
		p += sin(p.zxy*0.75*trk + iTime*trk*.8)*dspAmp;
        d -= abs(dot(cos(p), sin(p.yzx))*z);
        z *= 0.57;
        trk *= 1.4;
        p = p*m3;
    }
    
    // Adjusted parameters to tighten the tunnel and emphasize radial shape
    d = abs(d + prm1*3.) + prm1*.3 - 2.0 + bsMo.y; // Reduced subtraction from 2.5 to 2.0
    
    // INCREASED RADIAL CONTRIBUTION: Use a higher multiplier (0.5 instead of 0.2)
    return vec2(d + cl * 0.5 + 0.15, cl); // <<< ADJUSTED HERE
}


//render() Raymarcher with Custom Coloring
vec4 render( in vec3 ro, in vec3 rd, float time )
{
	vec4 rez = vec4(0);
    const float ldst = 8.;
	vec3 lpos = vec3(disp(time + ldst)*0.5, time + ldst);
	float t = 1.5;
	float fogT = 0.;
	for(int i=0; i<130; i++)
	{
		if(rez.a > 0.99)break;

		vec3 pos = ro + t*rd;
        vec2 mpv = map(pos);
		float den = clamp(mpv.x-0.3,0.,1.)*1.12;
		float dn = clamp((mpv.x + 2.),0.,3.);
        
		vec4 col = vec4(0);
        if (mpv.x > 0.6)
        {
            // CUSTOM COLOR LOGIC: Intense Neon Blue/Green Aesthetic
            
            // Tweak colors for a more electric/plasma look
            vec3 neon_base = vec3(0.0, 0.7, 1.0); // Brighter Neon Blue
            float saturation_mix = smoothstep(0.6, 1.0, den);
            
            col.rgb = mix(
                vec3(0.01, 0.05, 0.05) * den, // Dark base
                neon_base * (0.5 + 0.5 * sin(pos.z * 0.8 + iTime * 3.0)), // Faster, more intense pulse
                saturation_mix * 1.5 // Over-saturate the core ribbons
            );
            
            col.a = den*den*den * 0.18; // Increased alpha for thick ribbons
            
			col.rgb *= linstep(4.,-2.5, mpv.x)*2.3;
            
            float dif = clamp((den - map(pos + .8).x)/9. , 0.001, 1.);
            dif += clamp((den - map(pos+.35).x)/2.5, 0.001, 1. );
            col.rgb *= den*(vec3(0.005,.045,.075) + 1.5*vec3(0.033,0.07,0.03)*dif);
        }
		
		// Dark blue/cyan fog
		float fogC = exp(t*0.2 - 2.2);
		col.rgba += vec4(0.01, 0.03, 0.04, 0.01)*clamp(fogC-fogT, 0., 1.);
		fogT = fogC;
        
		rez = rez + col*(1. - rez.a);
        
        // Dynamic step size
		t += clamp(0.5 - dn*dn*.05, 0.09, 0.3);
	}
	return clamp(rez, 0.0, 1.0);
}


//mainImage()

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{	
	vec2 q = fragCoord.xy/iResolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5*iResolution.xy)/iResolution.y;
    bsMo = (iMouse.xy - 0.5*iResolution.xy)/iResolution.y;
    
    float time = iTime*3.;
    vec3 ro = vec3(0,0,time); 
    
    ro += vec3(sin(iTime)*0.5,sin(iTime*1.)*0.,0);
    
    float dspAmp = .85;
    ro.xy += disp(ro.z)*dspAmp;
    float tgtDst = 3.5;
    
    vec3 target = normalize(ro - vec3(disp(time + tgtDst)*dspAmp, time + tgtDst));
    ro.x -= bsMo.x*2.;
    vec3 rightdir = normalize(cross(target, vec3(0,1,0)));
    vec3 updir = normalize(cross(rightdir, target));
    rightdir = normalize(cross(updir, target));
	vec3 rd=normalize((p.x*rightdir + p.y*updir)*1. - target);
    rd.xy *= rot(-disp(time + 3.5).x*0.2 + bsMo.x);
    prm1 = smoothstep(-0.4, 0.4,sin(iTime*0.3));
	
    // 1. Render the volumetric scene
    vec4 scn = render(ro, rd, time);
		
    vec3 col = scn.rgb;
    
    // 2. Final color adjustment and vignetting
    col = pow(col, vec3(.55,0.65,0.6))*vec3(1.,.97,.9);

    col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12)*0.7+0.3; //Vignetting
    
    // 3. Apply ACES Tone Mapping (Boosted for high contrast sci-fi look)
    col = aces(col * 3.0); // Increased boost from 2.0 to 3.0

    fragColor = vec4( col, 1.0 );
}
