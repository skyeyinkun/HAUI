export interface CardEntityConfig {
    entity_id: string;
    ha_name?: string;
    display_name?: string;
    icon?: string;
    visible?: boolean;
}

export interface CardConfig {
    title: string;
    icon?: string;
    entities: CardEntityConfig[];
}
