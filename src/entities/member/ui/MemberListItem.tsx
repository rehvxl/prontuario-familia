import type { ReactNode } from 'react';
import { Avatar, ListItem } from '@/shared/ui';
import { formatAge } from '../domain/age';
import { relationshipLabel } from '../domain/labels';
import type { Member } from '../domain/member';

export interface MemberListItemProps {
  member: Member;
  /** Texto extra no fim do subtítulo (ex.: "8 documentos"). */
  extra?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}

/** Pessoa da família em lista: avatar na cor estável da pessoa, parentesco e idade. */
export function MemberListItem({ member, extra, onPress, trailing }: MemberListItemProps) {
  const subtitle = [relationshipLabel(member.relationship, member.sex), formatAge(member.birthDate), extra].filter(Boolean).join(' · ');
  return (
    <ListItem
      leading={<Avatar name={member.fullName} id={member.id} ring />}
      title={member.fullName}
      subtitle={subtitle}
      onPress={onPress}
      chevron={!!onPress}
      trailing={trailing}
      testID={`member-${member.id}`}
    />
  );
}
