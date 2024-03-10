#version 300 es
precision mediump float;

out vec4 out_color;
//uniform vec3 user_color;                    
uniform float alpha;
in vec3 color;

void main(void) {
//    out_color = vec4(user_color, alpha);
    out_color = vec4(color, alpha);
}
