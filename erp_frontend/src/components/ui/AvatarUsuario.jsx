import { Avatar, Tooltip } from 'antd';

function getColorFromName(name) {
  const colors = [
    '#ff7a45',
    '#f5222d',
    '#fa541c',
    '#faad14',
    '#ffc53d',
    '#fadb14',
    '#d4af37',
    '#a6d930',
    '#52c41a',
    '#13c2c2',
    '#1890ff',
    '#2f54eb',
    '#722ed1',
    '#eb2f96',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AvatarUsuario({ nome, foto, cargo, size = 'default' }) {
  const initials = nome
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const color = getColorFromName(nome);
  const sizeMap = {
    sm: 32,
    default: 40,
    md: 40,
    lg: 56,
  };

  const avatar = (
    <Avatar
      size={sizeMap[size] || 40}
      src={foto}
      style={!foto ? { backgroundColor: color, fontWeight: 600 } : {}}
    >
      {!foto && initials}
    </Avatar>
  );

  if (cargo) {
    return (
      <Tooltip title={`${nome} • ${cargo}`}>
        {avatar}
      </Tooltip>
    );
  }

  return avatar;
}
